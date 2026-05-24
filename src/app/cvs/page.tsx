"use client"

import { useState, useEffect } from "react"
import { supabase, type CvProfile } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, ArrowLeft, Star, Save, Edit, ChevronDown, ChevronUp } from "lucide-react"

const SKILL_LEVELS = ["básico", "medio", "fuerte", "experto"]

const EMPTY_CV = {
  name: "",
  is_default: false,
  cv_text: "",
  personal_intro: "",
  personal_context: "",
      experience_profile: {
        backend_professional_years: 0,
        support_years: 1,
        retail_years: 12
      },
      career_mode: "transition",
      relocation_preferences: {
        moving_to_sweden: true,
        ignore_location_if_remote: true
      },
  stack: "",
  looking_for: "",
  cover_tone: "cercano",
  preferred_language: "en",
  skill_levels: {} as Record<string, string>,
  career_context: {
    career_level: "junior-mid",
    avoid_false_seniority: true
  },
  smart_rules: {
    ignore_location_if_remote: true,
    relocation_to_sweden: false
  }
}

export default function CvsPage() {
  const router = useRouter()
  const [cvs, setCvs] = useState<CvProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newSkill, setNewSkill] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data } = await supabase.from("cv_profiles").select("*").eq("user_id", user.id).order("created_at")
      setCvs(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function save() {
    if (!editing?.name?.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      name: editing.name,
      is_default: editing.is_default || false,
      cv_text: editing.cv_text || "",
      personal_intro: editing.personal_intro || "",
      personal_context: editing.personal_context || "",
      stack: editing.stack || "",
      looking_for: editing.looking_for || "",
      cover_tone: editing.cover_tone || "cercano",
      preferred_language: editing.preferred_language || "en",
      skill_levels: editing.skill_levels || {},
      career_context: editing.career_context || {},
      smart_rules: editing.smart_rules || {}
    }

    if (isNew) {
      await supabase.from("cv_profiles").insert([{ ...payload, user_id: user.id }])
    } else {
      await supabase.from("cv_profiles").update(payload).eq("id", editing.id)
    }

    if (editing.is_default) {
      await supabase.from("cv_profiles").update({ is_default: false }).eq("user_id", user.id).neq("id", editing.id || "x")
    }

    const { data } = await supabase.from("cv_profiles").select("*").eq("user_id", user.id).order("created_at")
    setCvs(data || [])
    setEditing(null)
    setIsNew(false)
    setSaving(false)
    setShowAdvanced(false)
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

  function addSkill() {
    if (!newSkill.trim()) return
    setEditing({ ...editing, skill_levels: { ...editing.skill_levels, [newSkill.trim().toLowerCase()]: "medio" } })
    setNewSkill("")
  }

  function removeSkill(skill: string) {
    const updated = { ...editing.skill_levels }
    delete updated[skill]
    setEditing({ ...editing, skill_levels: updated })
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="text-blue-400 animate-spin" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 overflow-x-hidden">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold flex-1">Mis CVs</h1>
        <button onClick={() => { setEditing({ ...EMPTY_CV }); setIsNew(true); setShowAdvanced(false) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nuevo CV
        </button>
      </div>

      <div className="w-full max-w-5xl mx-auto p-6">
        {/* Lista de CVs */}
        {cvs.length === 0 && !editing ? (
          <div className="text-center py-16 text-gray-600">
            <p className="mb-4">No tienes CVs todavía</p>
            <button onClick={() => { setEditing({ ...EMPTY_CV }); setIsNew(true) }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl text-sm font-medium mx-auto">
              <Plus size={16} /> Crear mi primer CV
            </button>
          </div>
        ) : (
          <div className="grid gap-3 mb-6">
            {cvs.map(cv => (
              <div key={cv.id} className={`bg-gray-900 rounded-xl p-4 border overflow-hidden ${cv.is_default ? "border-blue-500" : "border-gray-800"}`}>
                <div className="flex items-center justify-between gap-4 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <h3 className="font-semibold truncate">{cv.name}</h3>
                    {cv.is_default && (
                      <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">
                        <Star size={10} fill="currentColor" /> Principal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!cv.is_default && (
                      <button onClick={() => setDefault(cv.id)} className="text-xs text-gray-500 hover:text-yellow-400 transition-colors">
                        Hacer principal
                      </button>
                    )}
                    <button onClick={() => { setEditing({ ...cv, skill_levels: cv.skill_levels || {}, career_context: cv.career_context || {}, smart_rules: cv.smart_rules || {} }); setIsNew(false) }}
                      className="text-gray-500 hover:text-gray-300 transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => deleteCv(cv.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {cv.stack && <p className="text-xs text-gray-500 mt-2 break-words line-clamp-2">{cv.stack}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Editor */}
        {editing && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 space-y-5">
            <h2 className="font-semibold">{isNew ? "Nuevo CV" : `Editando: ${editing.name}`}</h2>

            {/* Básicos */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Nombre del CV *</label>
              <input value={editing.name || ""}
                onChange={e => setEditing({...editing, name: e.target.value})}
                placeholder="CV Backend Suecia, CV Fullstack Remote..."
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Introducción personal</label>
              <p className="text-xs text-gray-600 mt-0.5 mb-1">Aparece verbatim en la cover. La IA NO la toca.</p>
              <textarea value={editing.personal_intro || ""}
                onChange={e => setEditing({...editing, personal_intro: e.target.value})}
                placeholder="Soy Manuel, desarrollador backend que se muda a Suecia con su familia en julio de 2026..."
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-24" />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">CV / Experiencia completa</label>
              <textarea value={editing.cv_text || ""}
                onChange={e => setEditing({...editing, cv_text: e.target.value})}
                placeholder="Experiencia, proyectos, educación..."
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-40" />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Stack técnico</label>
              <input value={editing.stack || ""}
                onChange={e => setEditing({...editing, stack: e.target.value})}
                placeholder=".NET 8, C#, Java, Node.js, React..."
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Qué busco</label>
              <input value={editing.looking_for || ""}
                onChange={e => setEditing({...editing, looking_for: e.target.value})}
                placeholder="Backend developer en Suecia o remoto..."
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Contexto personal para covers</label>
              <p className="text-xs text-gray-600 mt-0.5 mb-1">Aficiones, motivaciones, cosas que te hacen humano. La IA las usa cuando encajan.</p>
              <textarea value={editing.personal_context || ""}
                onChange={e => setEditing({...editing, personal_context: e.target.value})}
                placeholder="Me encanta el fútbol y los videojuegos. Padre de familia. Me mudo a Töre, Norrbotten en julio 2026 con mi mujer e hija. Aprendo sueco activamente..."
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-24" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Tono cover</label>
                <select value={editing.cover_tone || "cercano"}
                  onChange={e => setEditing({...editing, cover_tone: e.target.value})}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
                  <option value="cercano">Cercano y directo</option>
                  <option value="formal">Formal y profesional</option>
                  <option value="entusiasta">Entusiasta y motivado</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Idioma preferido</label>
                <select value={editing.preferred_language || "en"}
                  onChange={e => setEditing({...editing, preferred_language: e.target.value})}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="sv">Svenska</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            {/* Configuración avanzada */}
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-colors">
                <span>⚙️ Configuración avanzada de scoring</span>
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAdvanced && (
                <div className="px-4 pb-4 space-y-5 border-t border-gray-800 pt-4">

                  {/* Nivel real por tecnología */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Nivel real por tecnología</label>
                    <p className="text-xs text-gray-600 mt-0.5 mb-3">Esto hace el scoring honesto. Si pones Java sin experiencia real, la IA no lo sobrevalora.</p>

                    <div className="space-y-2 mb-3">
                      {Object.entries(editing.skill_levels || {}).map(([skill, level]) => (
                        <div key={skill} className="flex items-center gap-3">
                          <span className="text-sm text-gray-300 w-32 truncate">{skill}</span>
                          <select value={level as string}
                            onChange={e => setEditing({ ...editing, skill_levels: { ...editing.skill_levels, [skill]: e.target.value } })}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500">
                            {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                          <button onClick={() => removeSkill(skill)} className="text-gray-600 hover:text-red-400 transition-colors text-xs">✕</button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addSkill()}
                        placeholder="Añadir tecnología..."
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
                      <button onClick={addSkill} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs transition-colors">
                        Añadir
                      </button>
                    </div>
                  </div>

                  {/* Nivel de carrera */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Nivel de carrera</label>
                    <select value={editing.career_context?.career_level || "junior-mid"}
                      onChange={e => setEditing({ ...editing, career_context: { ...editing.career_context, career_level: e.target.value } })}
                      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500">
                      <option value="junior">Junior (0-1 años)</option>
                      <option value="junior-mid">Junior-Mid en transición</option>
                      <option value="mid">Mid (2-4 años)</option>
                      <option value="mid-senior">Mid-Senior (4-7 años)</option>
                      <option value="senior">Senior (7+ años)</option>
                    </select>
                  </div>

                  {/* Reglas inteligentes */}
                  <div className="space-y-3">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Reglas inteligentes</label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox"
                        checked={editing.smart_rules?.ignore_location_if_remote || false}
                        onChange={e => setEditing({ ...editing, smart_rules: { ...editing.smart_rules, ignore_location_if_remote: e.target.checked } })}
                        className="mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-300">Ignorar ubicación en ofertas remotas/híbridas</div>
                        <div className="text-xs text-gray-600">Si la oferta es remota, la ubicación no penaliza el score</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox"
                        checked={editing.career_context?.avoid_false_seniority || false}
                        onChange={e => setEditing({ ...editing, career_context: { ...editing.career_context, avoid_false_seniority: e.target.checked } })}
                        className="mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-300">No sobrevalorar seniority</div>
                        <div className="text-xs text-gray-600">Penaliza ofertas Senior si tu nivel es Junior/Mid</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox"
                        checked={editing.smart_rules?.relocation_to_sweden || false}
                        onChange={e => setEditing({ ...editing, smart_rules: { ...editing.smart_rules, relocation_to_sweden: e.target.checked } })}
                        className="mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-300">Me mudo a Suecia</div>
                        <div className="text-xs text-gray-600">Bonus en ofertas suecas. No menciona mudanza en ofertas remotas.</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 min-w-0">
              <input type="checkbox" id="isDefault"
                checked={editing.is_default || false}
                onChange={e => setEditing({...editing, is_default: e.target.checked})} />
              <label htmlFor="isDefault" className="text-sm text-gray-400">Usar como CV por defecto</label>
            </div>

            <div className="flex gap-3">
              <button onClick={save} disabled={saving || !editing.name?.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl text-sm font-medium transition-colors">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Save size={14} /> Guardar CV</>}
              </button>
              <button onClick={() => { setEditing(null); setIsNew(false); setShowAdvanced(false) }}
                className="px-6 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


