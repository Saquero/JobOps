import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const { description, title, company, notes, profile } = await req.json()

  const tone = profile?.cover_tone === 'formal' ? 'formal y profesional'
    : profile?.cover_tone === 'entusiasta' ? 'entusiasta y motivado'
    : 'cercano y directo'

  const language = profile?.preferred_language === 'es' ? 'español'
    : profile?.preferred_language === 'sv' ? 'svenska'
    : profile?.preferred_language === 'auto' ? 'el mismo idioma que la oferta de trabajo'
    : 'english'

  const prompt = `You are an expert cover letter writer for software developers.

Write a cover letter in ${language} with a ${tone} tone.
Maximum 3 paragraphs. Sound human, not generic.

CANDIDATE PROFILE:
${profile?.cv_text || 'Experienced backend developer'}

Technical stack: ${profile?.stack || '.NET, Java, Clean Architecture, DDD'}
Looking for: ${profile?.looking_for || 'Backend developer position'}

JOB:
Company: ${company}
Position: ${title}
Description: ${description}
Additional notes: ${notes || 'none'}

Write the letter directly, no subject line or formal header. Adapt the technical parts to match exactly what the job requires.`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    temperature: 0.7,
    max_tokens: 800,
  })

  const cover = completion.choices[0]?.message?.content || ''
  return NextResponse.json({ cover })
}
