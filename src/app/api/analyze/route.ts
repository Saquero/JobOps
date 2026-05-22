import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const { description, title, company } = await req.json()

  const prompt = `Eres un experto en análisis de ofertas de trabajo para desarrolladores backend.

Analiza esta oferta de trabajo y devuelve un JSON con este formato exacto:
{
  "fit_score": número del 0 al 100 indicando qué tan bien encaja para un desarrollador .NET/Java con Clean Architecture y DDD,
  "summary": "resumen de 2-3 frases de la oferta",
  "requirements": ["requisito 1", "requisito 2", "requisito 3"],
  "pros": ["punto positivo 1", "punto positivo 2"],
  "cons": ["punto negativo 1", "punto negativo 2"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "cover_angle": "enfoque recomendado para la carta de presentación en 2-3 frases"
}

Oferta:
Empresa: ${company}
Puesto: ${title}
Descripción: ${description}

Responde SOLO con el JSON, sin texto adicional.`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    temperature: 0.3,
    max_tokens: 1000,
  })

  const content = completion.choices[0]?.message?.content || '{}'

  try {
    const analysis = JSON.parse(content)
    return NextResponse.json(analysis)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
