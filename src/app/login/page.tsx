"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { BarChart3, Loader2, Mail, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMagicLink() {
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart3 className="text-blue-400" size={32} />
            <span className="text-3xl font-bold text-white">JobOps</span>
          </div>
          <p className="text-gray-400">Tu copiloto de búsqueda de empleo</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {!sent ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">Entrar</h2>
              <p className="text-sm text-gray-400 mb-6">
                Te enviamos un enlace mágico a tu email. Sin contraseñas.
              </p>

              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
                  placeholder="tu@email.com"
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={sendMagicLink}
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors text-white"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                  : <><Mail size={16} /> Enviar enlace mágico</>
                }
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
              <h2 className="text-lg font-semibold text-white mb-2">¡Revisa tu email!</h2>
              <p className="text-sm text-gray-400 mb-6">
                Te hemos enviado un enlace a <span className="text-white">{email}</span>.
                Haz clic en él para entrar.
              </p>
              <button
                onClick={() => { setSent(false); setEmail("") }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Usar otro email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
