import { NextRequest, NextResponse } from 'next/server'
import { groq, MODEL } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const { description, title, company, notes, cvProfile } = await req.json()

  const tone = cvProfile?.cover_tone === 'formal' ? 'formal and professional'
    : cvProfile?.cover_tone === 'entusiasta' ? 'enthusiastic and motivated'
    : 'close and direct'

  const language = cvProfile?.preferred_language === 'es' ? 'Spanish'
    : cvProfile?.preferred_language === 'sv' ? 'Swedish'
    : cvProfile?.preferred_language === 'auto' ? 'the same language as the job offer'
    : 'English'

  const hasPersonalIntro = cvProfile?.personal_intro?.trim()

  const prompt = `You are an expert cover letter writer for software developers.

Write a cover letter in ${language} with a ${tone} tone.
Maximum 3 paragraphs. Sound human, not generic.

${hasPersonalIntro ? `IMPORTANT: The first paragraph MUST use this personal introduction EXACTLY as written by the candidate — do NOT change it, do NOT rewrite it, include it verbatim:

"${cvProfile.personal_intro}"

Then write 1-2 more paragraphs adapting the technical parts to match the job requirements.` : `Write 3 paragraphs adapting to the job requirements.`}

CANDIDATE PROFILE:
${cvProfile?.cv_text || 'Experienced backend developer'}
Stack: ${cvProfile?.stack || '.NET, Java, Clean Architecture, DDD'}
Looking for: ${cvProfile?.looking_for || 'Backend developer position'}

JOB:
Company: ${company}
Position: ${title}
Description: ${description}
Additional notes: ${notes || 'none'}

Write the letter directly, no subject line or formal header.`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    temperature: 0.7,
    max_tokens: 1000,
  })

  const cover = completion.choices[0]?.message?.content || ''
  return NextResponse.json({ cover })
}
