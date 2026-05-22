"use client"

import { useState, useEffect } from "react"
import { supabase, type CvProfile } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  Star,
  Save,
  Edit,
  Upload,
  FileText
} from "lucide-react"

const EMPTY_CV: Partial<CvProfile> = {
  name: "",
  is_default: false,
  cv_text: "",
  personal_intro: "",
  stack: "",
  looking_for: "",
  cover_tone: "cercano",
  preferred_language: "en"
}

export default function CvsPage() {
  const router = useRouter()

  const [cvs, setCvs] = useState<CvProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<CvProfile> | null>(null)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { data } = await supabase
      .from("cv_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at")

    setCvs(data || [])
    setLoading(false)
  }

  async function handleCvFile(file: File) {
    const validExtensions = [".txt", ".md", ".markdown"]
    const lowerName = file.name.toLowerCase()

    if (!validExtensions.some(ext => lowerName.endsWith(ext))) {
      alert("De momento sube el CV en .txt o .md. Luego añadimos PDF/DOCX bien hecho.")
      return
    }

    const text = await file.text()

    setFileName(file.name)
    setEditing(prev => ({
      ...(prev || EMPTY_CV),
      name: prev?.name?.trim() || file.name.replace(/\.[^/.]+$/, ""),
      cv_text: text
    }))
  }

  async function save() {
    if (!editing?.name?.trim()) return

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (isNew) {
      await supabase.from("cv_profiles").insert([{
        ...editing,
        user_id: user.id
      }])
    } else {
      await supabase
        .from("cv_profiles")
        .update(editing)
        .eq("id", editing.id)
    }

    if (editing.is_default && editing.id) {
      await supabase
        .from("cv_profiles")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", editing.id)
    }

    setEditing(null)
    setIsNew(false)
    setFileName(null)
    setSaving(false)

    await load()
  }

  async function deleteCv(id: string) {
    await supabase.from("cv_profiles").delete().eq("id", id)
    setCvs(cvs.filter(c => c.id !== id))
  }

  async function setDefault(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("cv_profiles").update({ is_default: false }).eq("user_id", user.id)
    await supabase.from("cv_profiles").update({ is_default: true }).eq("id", id)

    setCvs(cvs.map(c => ({ ...c, is_default: c.id === id })))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="text-blue-400 animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-300">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-lg font-bold flex-1">Mis CVs</h1>

        <button
          onClick={() => {
            setEditing({ ...EMPTY_CV })
            setIsNew(true)
            setFileName(null)
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Nuevo CV
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {cvs.length === 0 && !editing && (
          <div className="text-center py-16 text-gray-600">
            <FileText size={42} className="mx-auto mb-4 opacity-40" />
            <p className="mb-4">No tienes CVs todavía</p>

            <button
              onClick={() => {
                setEditing({ ...EMPTY_CV })
                setIsNew(true)
                setFileName(null)
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl text-sm font-medium mx-auto"
            >
              <Plus size={16} />
              Crear mi primer CV
            </button>
          </div>
        )}

        {cvs.length > 0 && (
          <div className="grid gap-4 mb-6">
            {cvs.map(cv => (
              <div
                key={cv.id}
                className={`bg-gray-900 rounded-xl p-5 border ${cv.is_default ? "border-blue-500" : "border-gray-800"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{cv.name}</h3>

                      {cv.is_default && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">
                          <Star size={10} fill="currentColor" />
                          Principal
                        </span>
                      )}
                    </div>

                    {cv.stack && <p className="text-xs text-gray-500 mt-2">{cv.stack}</p>}
                    {cv.looking_for && <p className="text-xs text-gray-600 mt-1">{cv.looking_for}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    {!cv.is_default && (
                      <button
                        onClick={() => setDefault(cv.id)}
                        className="text-xs text-gray-500 hover:text-yellow-400"
                      >
                        Hacer principal
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditing(cv)
                        setIsNew(false)
                        setFileName(null)
                      }}
                      className="text-gray-500 hover:text-gray-300"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={() => deleteCv(cv.id)}
                      className="text-gray-600 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <section className="bg-gray-900 rounded-2xl p-6 border border-gray-700">
            <h2 className="font-semibold mb-6">
              {isNew ? "Nuevo CV" : `Editando: ${editing.name}`}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Nombre del CV *</label>
                <input
                  value={editing.name || ""}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="CV Backend Suecia, CV Fullstack Remote..."
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Introducción personal</label>
                <textarea
                  value={editing.personal_intro || ""}
                  onChange={e => setEditing({ ...editing, personal_intro: e.target.value })}
                  placeholder="Soy Manuel, desarrollador backend..."
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-28"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">CV / Experiencia completa</label>

                <label
                  className="mt-2 mb-3 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-700 hover:border-blue-500 bg-gray-800/60 rounded-xl px-4 py-6 cursor-pointer transition-colors"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleCvFile(file)
                  }}
                >
                  <Upload size={22} className="text-blue-400" />
                  <span className="text-sm text-gray-300">Subir CV en .txt o .md</span>
                  <span className="text-xs text-gray-600">También puedes arrastrarlo aquí</span>

                  {fileName && (
                    <span className="text-xs text-green-400 mt-1">
                      Archivo cargado: {fileName}
                    </span>
                  )}

                  <input
                    type="file"
                    accept=".txt,.md,.markdown"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleCvFile(file)
                    }}
                  />
                </label>

                <textarea
                  value={editing.cv_text || ""}
                  onChange={e => setEditing({ ...editing, cv_text: e.target.value })}
                  placeholder="Pega aquí tu CV completo o súbelo arriba..."
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-48"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Stack técnico</label>
                <input
                  value={editing.stack || ""}
                  onChange={e => setEditing({ ...editing, stack: e.target.value })}
                  placeholder=".NET 8, C#, Java, Spring Boot, Clean Architecture..."
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Qué busco</label>
                <input
                  value={editing.looking_for || ""}
                  onChange={e => setEditing({ ...editing, looking_for: e.target.value })}
                  placeholder="Backend developer en norte de Suecia, remoto/híbrido..."
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Tono</label>
                  <select
                    value={editing.cover_tone || "cercano"}
                    onChange={e => setEditing({ ...editing, cover_tone: e.target.value })}
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm"
                  >
                    <option value="cercano">Cercano y directo</option>
                    <option value="formal">Formal y profesional</option>
                    <option value="entusiasta">Entusiasta y motivado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Idioma</label>
                  <select
                    value={editing.preferred_language || "en"}
                    onChange={e => setEditing({ ...editing, preferred_language: e.target.value })}
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="sv">Svenska</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={editing.is_default || false}
                  onChange={e => setEditing({ ...editing, is_default: e.target.checked })}
                />
                <label htmlFor="isDefault" className="text-sm text-gray-400">
                  Usar como CV principal
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={save}
                disabled={saving || !editing.name?.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl text-sm font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Guardar CV
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setEditing(null)
                  setIsNew(false)
                  setFileName(null)
                }}
                className="px-6 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-sm"
              >
                Cancelar
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
