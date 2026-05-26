import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Job = {
  id: string
  created_at: string
  user_id: string
  title: string
  company: string
  location: string | null
  url: string | null
  description: string | null
  status: 'saved' | 'applied' | 'interview' | 'rejected' | 'offer'
  notes: string | null
  cover_letter: string | null
  salary: string | null
  tags: string[] | null
  ai_analysis: string | null
  fit_score: number | null
  cv_profile_id: string | null
  applied_at: string | null
  follow_up_date: string | null
  last_reviewed_at: string | null
  next_action: string | null
  cv_match_results: any[] | null
}

export type Profile = {
  id: string
  full_name: string | null
  cv_text: string | null
  stack: string | null
  looking_for: string | null
  cover_tone: string
  preferred_language: string
}

export type CvProfile = {
  id: string
  user_id: string
  name: string
  is_default: boolean
  cv_text: string | null
  personal_intro: string | null
  personal_context: string | null
  stack: string | null
  looking_for: string | null
  cover_tone: string
  preferred_language: string
  skill_levels: Record<string, string | { level: string; context?: string }> | null
  career_context: Record<string, any> | null
  smart_rules: Record<string, any> | null
  source_type: "manual" | "uploaded" | null
  original_file_name: string | null
  original_file_url: string | null
  raw_text: string | null
  parsed_profile: Record<string, any> | null
}




