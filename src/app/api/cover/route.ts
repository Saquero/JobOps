import { NextRequest, NextResponse } from "next/server"
import { groq, MODEL } from "@/lib/groq"

export async function POST(req: NextRequest) {
  const { description, title, company, notes, cvProfile } = await req.json()

  const preferredLanguage = cvProfile?.preferred_language || "auto"
  const tone = cvProfile?.cover_tone || "cercano"

  const outputLanguage =
    preferredLanguage === "es" ? "español" :
    preferredLanguage === "en" ? "inglés" :
    preferredLanguage === "sv" ? "sueco" :
    "el idioma más adecuado para la oferta"

  const prompt = `Eres experto escribiendo cartas de presentación honestas para candidatos tech.

REGLAS:
- La información base del candidato está en español.
- Solo la carta final debe salir en: ${outputLanguage}.
- Tono: ${tone}.
- No inventes experiencia profesional.
- No presentes Natura como experiencia developer. Es retail operations / team leadership.
- No menciones mudanza a Suecia salvo que la oferta sea en Suecia o el usuario lo haya indicado en notas.
- Para ofertas remotas fuera de Suecia, NO menciones la mudanza.
- Usa el contexto personal solo si aporta valor real.
- Máximo 3 párrafos.
- Sin subject ni cabecera formal.

INTRO PERSONAL OPCIONAL:
${cvProfile?.personal_intro || ""}

CONTEXTO PERSONAL:
${cvProfile?.personal_context || ""}

CV / PERFIL:
${cvProfile?.cv_text || ""}

STACK:
${cvProfile?.stack || ""}

QUÉ BUSCA:
${cvProfile?.looking_for || ""}

OFERTA:
Empresa: ${company}
Puesto: ${title}
Descripción: ${description}
Notas del usuario: ${notes || "ninguna"}

Escribe directamente la carta.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL,
      temperature: 0.45,
      max_tokens: 1000
    })

    const cover = completion.choices[0]?.message?.content || ""
    return NextResponse.json({ cover })
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate cover", details: String(err) }, { status: 500 })
  }
}
