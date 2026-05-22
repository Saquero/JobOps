"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { BarChart3, Loader2, Mail, Lock, UserPlus, ArrowLeft, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function register() {
    setError(null)

    if (!email.trim() || !password.trim() || !repeatPassword.trim()) {
      setError("Completa todos los campos.")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.")
      return
    }

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setCreated(true)
    setLoading(false)

    setTimeout(() => {
      router.push("/perfil")
    }, 900)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BarChart3 className="text-blue-400" size={32} />
            <span className="text-3xl font-bold text-white">JobOps</span>
          </div>
          <p className="text-gray-400">Crea tu perfil para gestionar tus ofertas</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {!created ? (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
              >
                <ArrowLeft size={16} />
                Volver al login
              </Link>

              <h2 className="text-lg font-semibold text-white mb-2">Crear cuenta</h2>
              <p className="text-sm text-gray-400 mb-6">
                Regístrate con email y contraseña. Después completarás tu perfil.
              </p>

              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-4 top-3.5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Contraseña</label>
                <div className="relative mt-1">
                  <Lock size={16} className="absolute left-4 top-3.5 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="mínimo 6 caracteres"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Repetir contraseña</label>
                <div className="relative mt-1">
                  <Lock size={16} className="absolute left-4 top-3.5 text-gray-500" />
                  <input
                    type="password"
                    value={repeatPassword}
                    onChange={e => setRepeatPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && register()}
                    placeholder="repite la contraseña"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={register}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors text-white"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Crear cuenta
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
              <h2 className="text-lg font-semibold text-white mb-2">Cuenta creada</h2>
              <p className="text-sm text-gray-400">
                Redirigiendo a tu perfil...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
