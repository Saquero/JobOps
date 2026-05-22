"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart3, Loader2, Mail, Lock, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function login() {
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  async function register() {
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Cuenta creada correctamente. Ya puedes entrar.");
    setLoading(false);
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
          <h2 className="text-lg font-semibold text-white mb-2">Entrar</h2>
          <p className="text-sm text-gray-400 mb-6">
            Accede con email y contraseña. Más rápido que magic link.
          </p>

          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Email
            </label>
            <div className="relative mt-1">
              <Mail
                size={16}
                className="absolute left-4 top-3.5 text-gray-500"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Contraseña
            </label>
            <div className="relative mt-1">
              <Lock
                size={16}
                className="absolute left-4 top-3.5 text-gray-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                placeholder="mínimo 6 caracteres"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="text-xs text-green-400 bg-green-900/20 rounded-lg px-3 py-2 mb-4">
              {message}
            </div>
          )}

          <button
            onClick={login}
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors text-white mb-3"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Procesando...
              </>
            ) : (
              "Entrar"
            )}
          </button>

          <button
            onClick={() => router.push("/register")}
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors text-white"
          >
            <UserPlus size={16} /> Crear cuenta
          </button>
        </div>
      </div>
    </div>
  );
}

