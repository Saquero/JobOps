"use client"

import { useState, useEffect, useRef } from "react"
import { supabase, type Profile } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Loader2, Save, ArrowLeft, Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"

export default function PerfilPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [uploadMessage, setUploadMessage] = useState("")
  const [dragging, setDragging] = useState(false)

  const [form, setForm] = useState({
    full_name: "",
    cv_text: "",
    stack: "",
    looking_for: "",
    cover_tone: "cercano",
    preferred_language: "en"
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (data) {
        setForm({
          full_name: data.full_name || "",
          cv_text: data.cv_text || "",
          stack: data.stack || "",
          looking_for: data.looking_for || "",
          cover_tone: data.cover_tone || "cercano",
          preferred_language: data.preferred_language || "en"
        })
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleFile(file: File) {
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
    const validExts = [".pdf", ".docx", ".txt"]
    const name = file.name.toLowerCase()
    const isValid = validTypes.includes(file.type) || validExts.some(e => name.endsWith(e))

    if (!isValid) {
      setUploadStatus("error")
      setUploadMessage("Formato no soportado. Usa PDF, DOCX o TXT.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus("error")
      setUploadMessage("El archivo es demasiado grande. Máximo 5MB.")
      return
    }

    setUploading(true)
    setUploadStatus("idle")

    const fd = new FormData()
    fd.append("file", file)

    try {
      const res = await fetch("/api/parse-cv", { method: "POST", body: fd })
      const data = await res.json()

      if (data.error) {
        setUploadStatus("error")
        setUploadMessage(data.error)
      } else {
        setForm(f => ({ ...f, cv_text: data.text }))
        setUploadStatus("success")
        setUploadMessage(`CV cargado correctamente (${file.name})`)
      }
    } catch {
      setUploadStatus("error")
      setUploadMessage("Error al subir el archivo.")
    }

    setUploading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profiles").upsert({
      id: user.id,
      ...form,
      updated_at: new Date().toISOString()
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="text-blue-400 animate-spin" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Mi Perfil</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Nombre completo</label>
          <input
            value={form.full_name}
            onChange={e => setForm({...form, full_name: e.target.value})}
            placeholder="Manuel Martínez"
            className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">CV</label>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-3 ${
              dragging ? "border-blue-500 bg-blue-950/20" : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Procesando CV...</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-400">Arrastra tu CV aquí o haz clic para seleccionar</p>
                <p className="text-xs text-gray-600 mt-1">PDF, DOCX o TXT · Máximo 5MB</p>
              </>
            )}
          </div>

          {uploadStatus === "success" && (
            <div className="flex items-center gap-2 text-green-400 text-xs bg-green-900/20 rounded-lg px-3 py-2 mb-3">
              <CheckCircle size={14} />
              {uploadMessage}
            </div>
          )}
          {uploadStatus === "error" && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 rounded-lg px-3 py-2 mb-3">
              <AlertCircle size={14} />
              {uploadMessage}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Texto extraído — revisa y edita si hace falta</span>
          </div>
          <textarea
            value={form.cv_text}
            onChange={e => setForm({...form, cv_text: e.target.value})}
            placeholder="El texto de tu CV aparecerá aquí tras subir el archivo. También puedes escribir o pegar directamente."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-48"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Stack técnico principal</label>
          <input
            value={form.stack}
            onChange={e => setForm({...form, stack: e.target.value})}
            placeholder=".NET 8, C#, Java, Spring Boot, Clean Architecture, DDD..."
            className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Qué busco</label>
          <input
            value={form.looking_for}
            onChange={e => setForm({...form, looking_for: e.target.value})}
            placeholder="Backend developer en Suecia, abierto a remoto..."
            className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Tono de las covers</label>
            <select
              value={form.cover_tone}
              onChange={e => setForm({...form, cover_tone: e.target.value})}
              className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="cercano">Cercano y directo</option>
              <option value="formal">Formal y profesional</option>
              <option value="entusiasta">Entusiasta y motivado</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Idioma preferido</label>
            <select
              value={form.preferred_language}
              onChange={e => setForm({...form, preferred_language: e.target.value})}
              className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="sv">Svenska</option>
              <option value="auto">Auto (según la oferta)</option>
            </select>
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
            : saved ? "✓ Guardado"
            : <><Save size={16} /> Guardar perfil</>}
        </button>

      </div>
    </div>
  )
}