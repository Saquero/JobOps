import { NextRequest, NextResponse } from "next/server"
import { groq, MODEL } from "@/lib/groq"
import * as cheerio from "cheerio"

function looksLikeValidJobText(text: string) {
  const clean = text.toLowerCase()
  if (!text || text.trim().length < 350) return false
  const badSignals = ["enable javascript", "access denied", "captcha", "cloudflare", "cookies", "condiciones", "centro de privacidad", "© 2026 indeed"]
  if (badSignals.some(s => clean.includes(s)) && clean.length < 1200) return false
  const jobSignals = ["requisitos", "funciones", "experiencia", "ofrecemos", "responsabilidades", "requirements", "responsibilities", "experience", "qualifications", "job description", "about the role", "benefits", "puesto", "jornada"]
  return jobSignals.some(s => clean.includes(s))
}

function normalizeScore(value: unknown) {
  const match = String(value ?? "").match(/-?\d+(\.\d+)?/)
  const num = match ? Number(match[0]) : NaN
  return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 0
}

function normalizeSkillLevels(skillLevels: any) {
  if (!skillLevels || typeof skillLevels !== "object") return "No especificado"

  return Object.entries(skillLevels)
    .map(([skill, value]: any) => {
      if (typeof value === "string") return `${skill}: nivel ${value}`
      return `${skill}: nivel ${value.level || "medio"}${value.context ? `, contexto: ${value.context}` : ""}`
    })
    .join("\n")
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
        scrape_error = "No se pudo extraer una oferta válida desde la URL."
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

  const skillLevelsText = normalizeSkillLevels(cvProfile?.skill_levels)
  const careerContext = cvProfile?.career_context || {}
  const smartRules = cvProfile?.smart_rules || {}

  const prompt = `Eres un analista de carrera HONESTO. Analiza la oferta contra el perfil real del candidato.

REGLAS CRÍTICAS:
- Responde SIEMPRE en español.
- No infles porcentajes.
- No confundas experiencia retail/operaciones con experiencia profesional como developer.
- Si una tecnología aparece en portfolio/proyectos personales, puntúa menos que experiencia profesional.
- Si el puesto es senior y el candidato no tiene experiencia profesional equivalente, seniority_match debe ser bajo.
- Si el puesto es remoto, la ubicación NO debe penalizar.
- Si la oferta no es de Suecia, NO uses la mudanza a Suecia como punto negativo.
- Si la oferta es en Suecia/Norrbotten/Luleå, la mudanza a Suecia puede ser positiva.
- Si falta información, usa null. No inventes.

CONTEXTO DE CARRERA:
Nivel declarado: ${careerContext.career_level || "junior-mid en transición"}
Evitar falso seniority: ${careerContext.avoid_false_seniority ? "sí" : "no"}
Ignorar ubicación si remoto: ${smartRules.ignore_location_if_remote ? "sí" : "no"}
Mudanza a Suecia: ${smartRules.relocation_to_sweden ? "sí" : "no"}

NIVELES REALES POR TECNOLOGÍA:
${skillLevelsText}

PERFIL DEL CANDIDATO:
${cvProfile?.cv_text || ""}

STACK:
${cvProfile?.stack || ""}

QUÉ BUSCA:
${cvProfile?.looking_for || ""}

CONTEXTO PERSONAL:
${cvProfile?.personal_context || ""}

Devuelve SOLO JSON válido:
{
  "title": "puesto o null",
  "company": "empresa o null",
  "location": "ubicación o null",
  "salary": "salario o null",
  "description": "resumen en español de 2-4 párrafos",
  "fit_score": 0,
  "score_breakdown": {
    "stack_match": 0,
    "experience_match": 0,
    "location_match": 0,
    "language_match": 0,
    "role_match": 0,
    "seniority_match": 0
  },

  "fit_type": "strong_fit | growth_fit | aspirational_fit | long_shot",

  "application_strategy": {
    "should_apply": true,
    "effort_level": "low | medium | high",
    "reason": "explicación honesta"
  },

  "confidence_analysis": {
    "real_experience": ["skills reales"],
    "learning_skills": ["skills aprendiendo"],
    "overstated_risk": ["riesgos de inflar perfil"]
  },
  "score_explanation": {
    "why_good": ["motivo"],
    "why_not": ["motivo"],
    "honest_verdict": "veredicto honesto en 1-2 frases"
  },
  "summary": "resumen corto en español",
  "requirements": ["requisito"],
  "pros": ["pro"],
  "cons": ["contra"],
  "keywords": ["keyword"],
  "cover_angle": "enfoque recomendado en español",
  "tags": ["tag"]
}

OFERTA:
${content}`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL,
      temperature: 0.05,
      max_tokens: 2200
    })

    const raw = completion.choices[0]?.message?.content || "{}"
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const data = JSON.parse(cleaned)

    const bd = data.score_breakdown || {}
    const score_breakdown = {
      stack_match: normalizeScore(bd.stack_match),
      experience_match: normalizeScore(bd.experience_match),
      location_match: normalizeScore(bd.location_match),
      language_match: normalizeScore(bd.language_match),
      role_match: normalizeScore(bd.role_match),
      seniority_match: normalizeScore(bd.seniority_match)
    }

    let fit_score = Math.round(
      score_breakdown.stack_match * 0.22 +
      score_breakdown.experience_match * 0.25 +
      score_breakdown.role_match * 0.20 +
      score_breakdown.seniority_match * 0.18 +
      score_breakdown.location_match * 0.10 +
      score_breakdown.language_match * 0.05
    )

    const learningSkills = data.confidence_analysis?.learning_skills || []

    if (
      learningSkills.some((s: string) =>
        ["java", "spring", "microservices", "angular"].some(k =>
          s.toLowerCase().includes(k)
        )
      )
    ) {
      fit_score = Math.max(0, fit_score - 10)
    }

    return NextResponse.json({
      ...data,
      title: data.title || "Oferta sin título",
      company: data.company || "Empresa pendiente",
      description: data.description || data.summary || null,
      fit_score,
      score_breakdown,
      score_explanation: data.score_explanation || null,
      fit_type: data.fit_type || "growth_fit",
      application_strategy: data.application_strategy || null,
      confidence_analysis: data.confidence_analysis || null,
      url: url || null,
      scraped,
      scrape_failed,
      scrape_error
    })
  } catch (err) {
    return NextResponse.json({ error: "Failed to analyze job", details: String(err) }, { status: 500 })
  }
}

