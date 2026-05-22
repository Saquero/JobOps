import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/groq'
import * as cheerio from 'cheerio'

async function scrapeUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)
    $('script, style, nav, footer, header, aside, iframe, noscript').remove()
    const text = $('main, article, .job, #job, [class*="job"], [class*="position"], [class*="career"], body')
      .first().text().replace(/\s+/g, ' ').trim().slice(0, 8000)
    return text
  } catch (error) {
    throw new Error(`Could not scrape URL: ${error}`)
  }
}

export async function POST(req: NextRequest) {
  const { input, profile } = await req.json()

  if (!input?.trim()) {
    return NextResponse.json({ error: 'No input provided' }, { status: 400 })
  }

  let content = input
  let scraped = false
  let scrapeError = null

  const isUrl = input.trim().startsWith('http://') || input.trim().startsWith('https://')

  if (isUrl) {
    try {
      content = await scrapeUrl(input.trim())
      scraped = true
    } catch (err) {
      scrapeError = String(err)
      content = input
    }
  }

  const prompt = `You are an expert job offer analyst for software developers.

Analyze this job offer and return ONLY a valid JSON with this exact format:
{
  "title": "job title",
  "company": "company name",
  "location": "location or null",
  "salary": "salary or null",
  "description": "complete job description summarized in 3-5 paragraphs",
  "fit_score": number 0-100 based on candidate profile match,
  "summary": "executive summary 2-3 sentences",
  "requirements": ["req 1", "req 2", "req 3"],
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1", "con 2"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "cover_angle": "recommended cover letter angle 2-3 sentences",
  "tags": ["tag1", "tag2"]
}

CANDIDATE PROFILE:
${profile?.cv_text || 'Experienced backend developer'}
Stack: ${profile?.stack || '.NET, Java, Clean Architecture, DDD'}
Looking for: ${profile?.looking_for || 'Backend developer position'}

JOB CONTENT:
${content}

Return ONLY valid JSON, no backticks, no extra text.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1500,
    })

    const raw = completion.choices[0]?.message?.content || '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json({ ...data, scraped, scrape_error: scrapeError })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to analyze job', details: String(err) }, { status: 500 })
  }
}
