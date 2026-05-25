"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendReset() {
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/update-password`
      }
    );

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Te hemos enviado un enlace para cambiar tu contraseña.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft size={16} />
          Volver al login
        </button>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">

          <h1 className="text-2xl font-bold text-white mb-2">
            Recuperar contraseña
          </h1>

          <p className="text-sm text-gray-400 mb-6">
            Introduce tu email y te enviaremos un enlace para cambiar tu contraseña.
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
            onClick={sendReset}
            disabled={loading || !email.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors text-white"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar enlace"
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
