import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function requireUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null

  if (!token) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }
  }

  return {
    user: data.user,
    error: null
  }
}
