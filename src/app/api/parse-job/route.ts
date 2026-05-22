import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/groq'
import * as cheerio from 'cheerio'

function looksLikeValidJobText(text: string) {
  const clean = text.toLowerCase()
  if (text.length < 900) return false
  if (clean.includes('enable javascript')) return false
  if (clean.includes('access denied')) return false
  if (clean.includes('captcha')) return false
  if (clean.includes('cloudflare')) return false
  if (clean.includes('sign in')) return false

  const jobSignals = [
    'responsibilities',
    'requirements',
    'qualifications',
    'experience',
    'about the role',
    'job description',
    'what you will do',
    'skills',
    'benefits',
    'requisitos',
    'funciones',
    'experiencia',
    'ofrecemos',
    'responsabilidades'
  ]

  return jobSignals.some(signal => clean.includes(signal))
}

async function scrapeUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    signal: AbortSignal.timeout(10000)
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  $('script, style, nav, footer, header, aside, iframe, noscript').remove()

  return $('main, article, body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 9000)
}

export async function POST(req: NextRequest) {
  const { input, manualText, originalUrl, cvProfile } = await req.json()

  const url = originalUrl?.trim() || ''
  const text = manualText?.trim() || ''
  const isUrl = input?.trim()?.startsWith('http://') || input?.trim()?.startsWith('https://')

  if (!input?.trim() && !url && !text) {
    return NextResponse.json({ error: 'No input provided' }, { status: 400 })
  }

  let content = text
  let scraped = false
  let scrape_failed = false
  let scrape_error = null

  if (!content && (isUrl || url)) {
    try {
      const scrapedText = await scrapeUrl(url || input.trim())

      if (!looksLikeValidJobText(scrapedText)) {
        scrape_failed = true
        scrape_error = 'The page could not be extracted reliably.'
      } else {
        content = scrapedText
        scraped = true
      }
    } catch (err) {
      scrape_failed = true
      scrape_error = String(err)
    }
  }

  if (!content && scrape_failed) {
    return NextResponse.json({
      scrape_failed: true,
      scraped: false,
      scrape_error,
      url: url || input.trim()
    })
  }

  const prompt = `You are an expert job offer analyst.

Analyze this REAL job offer. Do not invent missing company names, titles or technologies.
If something is not present, use null.

Return ONLY valid JSON:
{
  "title": "job title or null",
  "company": "company name or null",
  "location": "location or null",
  "salary": "salary or null",
  "description": "summary in 3-5 paragraphs",
  "fit_score": number 0-100,
  "summary": "2-3 sentence summary",
  "requirements": ["req 1", "req 2"],
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1", "con 2"],
  "keywords": ["keyword1", "keyword2"],
  "cover_angle": "recommended cover letter angle",
  "tags": ["tag1", "tag2"]
}

CANDIDATE PROFILE:
${cvProfile?.cv_text || ''}
Stack: ${cvProfile?.stack || ''}
Looking for: ${cvProfile?.looking_for || ''}

JOB OFFER TEXT:
${content}`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.1,
      max_tokens: 1500
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json({
      ...data,
      title: data.title || 'Oferta sin título',
      company: data.company || 'Empresa pendiente',
      url: url || (isUrl ? input.trim() : null),
      scraped,
      scrape_failed,
      scrape_error
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to analyze job', details: String(err) }, { status: 500 })
  }
}
