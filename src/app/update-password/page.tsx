"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updatePassword() {
    if (password.length < 6) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Contraseña actualizada correctamente.");

    setTimeout(() => {
      router.push("/login");
    }, 1500);

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">

          <h1 className="text-2xl font-bold text-white mb-2">
            Nueva contraseña
          </h1>

          <p className="text-sm text-gray-400 mb-6">
            Introduce una nueva contraseña segura.
          </p>

          <div className="mb-4">
            <label className="text-xs text-gray-500 uppercase tracking-wide">
              Nueva contraseña
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
            onClick={updatePassword}
            disabled={loading || password.length < 6}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors text-white"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar contraseña"
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
