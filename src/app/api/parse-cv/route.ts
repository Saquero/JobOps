import { NextRequest, NextResponse } from "next/server"
import { groq, MODEL } from "@/lib/groq"
import { requireUser } from "@/lib/supabase-server"
import { rateLimit } from "@/lib/rate-limit"

function extractJson(raw: string) {
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  const first = cleaned.indexOf("{")
  const last = cleaned.lastIndexOf("}")

  if (first >= 0 && last > first) {
    return cleaned.slice(first, last + 1)
  }

  return cleaned
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const limit = rateLimit(auth.user!.id, 8, 60_000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un minuto y vuelve a intentarlo." },
      { status: 429 }
    )
  }

  const { cvText, fileName } = await req.json()

  if (!cvText || String(cvText).trim().length < 300) {
    return NextResponse.json({
      error: "El CV no tiene texto suficiente. Puede ser un PDF visual/no ATS. Prueba con DOCX, TXT o revisa el texto extraído."
    }, { status: 400 })
  }

  const prompt = `Analiza este CV como un parser ATS/recruiter universal.

IMPORTANTE:
- Responde SOLO JSON válido.
- No inventes experiencia.
- Diferencia claramente:
  - resumen profesional
  - experiencia laboral real
  - proyectos/portfolio
  - educación
  - skills
  - idiomas
  - señales personales
  - riesgos de sobreventa
- El about/profile NO cuenta como experiencia laboral.
- Los proyectos NO cuentan igual que experiencia profesional.
- Debe funcionar para cualquier tipo de CV: tech, soporte, ventas, retail, administración, logística, etc.

Devuelve este JSON:

{
  "document_info": {
    "file_name": "${fileName || null}",
    "ats_readability": "high | medium | low",
    "language": "es | en | sv | mixed | unknown",
    "warnings": ["warning"]
  },
  "candidate": {
    "name": "nombre o null",
    "email": "email o null",
    "phone": "telefono o null",
    "location": "ubicacion o null",
    "links": ["link"]
  },
  "professional_summary": "resumen profesional detectado",
  "primary_role": "rol principal inferido",
  "secondary_roles": ["rol secundario"],
  "career_level": "junior | junior-mid | mid | senior | transition | unknown",
  "work_experience": [
    {
      "company": "empresa",
      "role": "cargo",
      "period": "periodo",
      "type": "professional_work | internship | operations | support | unknown",
      "summary": "resumen",
      "skills_used": ["skill"]
    }
  ],
  "projects": [
    {
      "name": "proyecto",
      "type": "portfolio | production | internal_tool | academic | unknown",
      "summary": "resumen",
      "skills_used": ["skill"],
      "evidence_strength": "high | medium | low"
    }
  ],
  "education": ["educacion"],
  "skills": {
    "core_stack": ["skill principal"],
    "secondary_stack": ["skill secundario"],
    "learning_or_exploring": ["skill en aprendizaje"],
    "soft_skills": ["skill blanda"]
  },
  "languages": ["idioma"],
  "experience_signals": {
    "backend": 0,
    "frontend": 0,
    "support": 0,
    "sysadmin": 0,
    "devops": 0,
    "operations": 0,
    "customer_service": 0
  },
  "risk_flags": ["riesgo"],
  "cv_improvement_suggestions": ["mejora"]
}

CV TEXT:
${String(cvText).slice(0, 12000)}`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL,
      temperature: 0.05,
      max_tokens: 2500
    })

    const raw = completion.choices[0]?.message?.content || "{}"
    const cleaned = extractJson(raw)

    try {
      const parsed = JSON.parse(cleaned)
      return NextResponse.json({ parsed_profile: parsed })
    } catch (parseErr) {
      return NextResponse.json({
        error: "La IA devolvió JSON inválido al analizar el CV.",
        details: String(parseErr)
      }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({
      error: "Failed to parse CV",
      details: String(err)
    }, { status: 500 })
  }
}
