import { NextRequest, NextResponse } from "next/server"
import { groq, MODEL } from "@/lib/groq"
import * as cheerio from "cheerio"

function looksLikeValidJobText(text: string) {
  const clean = text.toLowerCase()
  if (!text || text.trim().length < 350) return false
  const badSignals = ["enable javascript", "access denied", "captcha", "cloudflare", "cookies", "condiciones", "centro de privacidad", "© 2026 indeed"]
  if (badSignals.some(s => clean.includes(s)) && clean.length < 1200) return false
  const jobSignals = ["requisitos", "funciones", "experiencia", "ofrecemos", "responsabilidades", "requirements", "responsibilities", "experience", "qualifications", "job description", "about the role", "benefits"]
  return jobSignals.some(s => clean.includes(s))
}

function normalizeScore(value: unknown) {
  const match = String(value ?? "").match(/-?\d+(\.\d+)?/)
  const num = match ? Number(match[0]) : NaN
  return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 0
}

async function scrapeUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    signal: AbortSignal.timeout(10000)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  $("script, style, nav, footer, header, aside, iframe, noscript").remove()
  return $("main, article, body").text().replace(/\s+/g, " ").trim().slice(0, 9000)
}

export async function POST(req: NextRequest) {
  const { manualText, originalUrl, cvProfile } = await req.json()

  const url = originalUrl?.trim() || ""
  const text = manualText?.trim() || ""

  let content = ""
  let scraped = false
  let scrape_failed = false
  let scrape_error = null

  if (text) {
    if (!looksLikeValidJobText(text)) {
      return NextResponse.json({
        error: "El texto pegado no parece una oferta válida. Pega la descripción real del puesto, requisitos y condiciones."
      }, { status: 400 })
    }
    content = text
  } else if (url) {
    try {
      const scrapedText = await scrapeUrl(url)
      if (!looksLikeValidJobText(scrapedText)) {
        scrape_failed = true
        scrape_error = "The page could not be extracted reliably."
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
    return NextResponse.json({ scrape_failed: true, scraped: false, scrape_error, url })
  }

  if (!content) {
    return NextResponse.json({ error: "No hay texto suficiente para analizar." }, { status: 400 })
  }

  const skillLevels = cvProfile?.skill_levels || {}
  const careerContext = cvProfile?.career_context || {}
  const smartRules = cvProfile?.smart_rules || {}
  const personalContext = cvProfile?.personal_context || ""

  const skillLevelsText = Object.keys(skillLevels).length > 0
    ? Object.entries(skillLevels).map(([k, v]) => `${k}: ${v}`).join(", ")
    : "not specified"

  const prompt = `You are an HONEST career analyst. Your job is to give REALISTIC scores, not flattering ones.

CRITICAL RULES:
${careerContext.career_level ? `- Candidate is: ${careerContext.career_level}. Do NOT score seniority high if job requires senior.` : ""}
${careerContext.avoid_false_seniority ? "- NEVER assume experience the candidate does not explicitly have. If they list a skill without professional experience, score it lower." : ""}
${smartRules.ignore_location_if_remote ? "- If the job is remote or hybrid, set location_match to 90+ regardless of candidate location." : ""}
${smartRules.relocation_to_sweden ? "- Candidate is relocating to Sweden. For Swedish jobs this is a strong positive." : ""}

CANDIDATE REAL SKILL LEVELS:
${skillLevelsText}

CANDIDATE PROFILE:
${cvProfile?.cv_text || ""}
Stack: ${cvProfile?.stack || ""}
Looking for: ${cvProfile?.looking_for || ""}
${personalContext ? `Personal context: ${personalContext}` : ""}

Analyze this job offer and return ONLY valid JSON:
{
  "title": "job title or null",
  "company": "company name or null",
  "location": "location or null",
  "salary": "salary or null",
  "description": "summary in 3-5 paragraphs",
  "fit_score": number 0-100 weighted average,
  "score_breakdown": {
    "stack_match": number 0-100,
    "experience_match": number 0-100,
    "location_match": number 0-100,
    "language_match": number 0-100,
    "role_match": number 0-100,
    "seniority_match": number 0-100
  },
  "score_explanation": {
    "why_good": ["reason 1", "reason 2"],
    "why_not": ["reason 1", "reason 2"],
    "honest_verdict": "1-2 sentence honest assessment"
  },
  "summary": "2-3 sentence summary",
  "requirements": ["req 1", "req 2"],
  "pros": ["pro 1", "pro 2"],
  "cons": ["con 1", "con 2"],
  "keywords": ["keyword1", "keyword2"],
  "cover_angle": "recommended cover letter angle — mention Sweden relocation only if relevant (not remote)",
  "tags": ["tag1", "tag2"]
}

JOB OFFER TEXT:
${content}`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL,
      temperature: 0.1,
      max_tokens: 2000
    })

    const raw = completion.choices[0]?.message?.content || "{}"
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const data = JSON.parse(cleaned)

    const bd = data.score_breakdown || {}
    const scoreBreakdown = {
      stack_match: normalizeScore(bd.stack_match),
      experience_match: normalizeScore(bd.experience_match),
      location_match: normalizeScore(bd.location_match),
      language_match: normalizeScore(bd.language_match),
      role_match: normalizeScore(bd.role_match),
      seniority_match: normalizeScore(bd.seniority_match)
    }

    const calculatedFitScore = Math.round(
      scoreBreakdown.stack_match * 0.25 +
      scoreBreakdown.experience_match * 0.20 +
      scoreBreakdown.role_match * 0.20 +
      scoreBreakdown.seniority_match * 0.15 +
      scoreBreakdown.location_match * 0.10 +
      scoreBreakdown.language_match * 0.10
    )

    return NextResponse.json({
      ...data,
      title: data.title || "Oferta sin título",
      company: data.company || "Empresa pendiente",
      fit_score: calculatedFitScore,
      score_breakdown: scoreBreakdown,
      score_explanation: data.score_explanation || null,
      url: url || null,
      scraped,
      scrape_failed,
      scrape_error
    })
  } catch (err) {
    return NextResponse.json({ error: "Failed to analyze job", details: String(err) }, { status: 500 })
  }
}
