"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, type Job, type CvProfile } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Plus, Briefcase, BarChart3, Loader2, Sparkles, Copy, Trash2, ExternalLink, User, LogOut, FileText, ChevronDown, Edit, Save, X } from "lucide-react"

const STATUS_CONFIG = {
  saved: { label: "Guardada", color: "bg-slate-100 text-slate-700" },
  applied: { label: "Aplicada", color: "bg-blue-100 text-blue-700" },
  interview: { label: "Entrevista", color: "bg-yellow-100 text-yellow-700" },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-700" },
  offer: { label: "Oferta", color: "bg-green-100 text-green-700" },
}

export default function Home() {
  const router = useRouter()

  const [jobs, setJobs] = useState<Job[]>([])
  const [cvProfiles, setCvProfiles] = useState<CvProfile[]>([])
  const [selectedCv, setSelectedCv] = useState<CvProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [generatingCover, setGeneratingCover] = useState(false)
  const [input, setInput] = useState("")
  const [jobUrl, setJobUrl] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<any>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCvSelector, setShowCvSelector] = useState(false)

  const [editingJob, setEditingJob] = useState(false)
  const [editData, setEditData] = useState({
    title: "",
    company: "",
    location: "",
    url: "",
    description: "",
    notes: "",
  })

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false })
    setJobs(data || [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: cvData } = await supabase.from("cv_profiles").select("*").eq("user_id", user.id).order("created_at")
      setCvProfiles(cvData || [])
      setSelectedCv(cvData?.find(c => c.is_default) || cvData?.[0] || null)

      await fetchJobs()
      setLoading(false)
    }

    init()
  }, [router, fetchJobs])

  function openNewJobModal() {
    setShowForm(true)

    setParsed(null)
    setInput("")
    setJobUrl("")
    setParseError(null)
  }

  function startEditing(job: Job) {
    setEditingJob(true)
    setEditData({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      url: job.url || "",
      description: job.description || "",
      notes: job.notes || "",
    })
  }

  function cancelEditing() {
    setEditingJob(false)
  }

  async function saveEditedJob() {
    if (!selectedJob) return

    const payload = {
      title: editData.title.trim() || "Oferta sin título",
      company: editData.company.trim() || "Empresa pendiente",
      location: editData.location.trim() || null,
      url: editData.url.trim() || null,
      description: editData.description.trim() || null,
      notes: editData.notes.trim() || null,
    }

    await supabase.from("jobs").update(payload).eq("id", selectedJob.id)

    const updated = { ...selectedJob, ...payload }
    setSelectedJob(updated)
    setJobs(jobs.map(j => j.id === selectedJob.id ? updated : j))
    setEditingJob(false)
  }

  async function reanalyzeJob() {
    if (!selectedJob) return

    if (!editData.description.trim()) {
      alert("Añade la descripción real de la oferta antes de reanalizar.")
      return
    }

    setParsing(true)

    try {
      const res = await fetch("/api/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualText: editData.description.trim(),
          originalUrl: editData.url.trim(),
          cvProfile: selectedCv
        })
      })

      const data = await res.json()

      if (data.error) {
        alert(data.error)
        setParsing(false)
        return
      }

      const ai_analysis = JSON.stringify({
        summary: data.summary,
        requirements: data.requirements,
        pros: data.pros,
        cons: data.cons,
        keywords: data.keywords,
        cover_angle: data.cover_angle,
        fit_score: data.fit_score,
        score_breakdown: data.score_breakdown
      })

      const payload = {
        title: data.title || editData.title || "Oferta sin título",
        company: data.company || editData.company || "Empresa pendiente",
        location: data.location || editData.location || null,
        url: editData.url.trim() || data.url || null,
        description: data.description || editData.description || null,
        fit_score: Number.isFinite(Number(data.fit_score)) ? Number(data.fit_score) : null,
        ai_analysis
      }

      await supabase.from("jobs").update(payload).eq("id", selectedJob.id)

      const updated = { ...selectedJob, ...payload }
      setSelectedJob(updated)
      setJobs(jobs.map(j => j.id === selectedJob.id ? updated : j))

      setEditData(prev => ({
        ...prev,
        title: payload.title,
        company: payload.company,
        location: payload.location || "",
        url: payload.url || "",
        description: payload.description || "",
      }))

      setEditingJob(false)
    } catch {
      alert("Error al reanalizar la oferta.")
    }

    setParsing(false)
  }

  async function parseJob() {
    if (!input.trim() && !jobUrl.trim()) return

    setParsing(true)
    setParseError(null)

    setParsed(null)

    try {
      const res = await fetch("/api/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualText: input.trim(),
          originalUrl: jobUrl.trim(),
          cvProfile: selectedCv
        })
      })

      const data = await res.json()

      if (data.error) {
        setParseError(data.error)
        setParsing(false)
        return
      }

      if (data.scrape_failed && !input.trim()) {
        setParseError("No pude leer correctamente la oferta desde la URL. Puedes guardarla igualmente o pegar el texto manualmente después.")
        setParsed({
          title: "Oferta guardada sin analizar",
          company: "Empresa pendiente",
          location: null,
          salary: null,
          description: null,
          fit_score: null,
          summary: null,
          keywords: [],
          url: jobUrl.trim(),
          manual_needed: true
        })
        setParsing(false)
        return
      }

      setParsed({ ...data, url: data.url || jobUrl.trim() || null })
    } catch {
      setParseError("Error al analizar. Intenta pegar el texto manualmente.")
    }

    setParsing(false)
  }

  async function saveJob() {
    if (!parsed) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { scrape_error, scraped, scrape_failed, manual_needed, summary, requirements, pros, cons, keywords, cover_angle, fit_score, score_breakdown, score_explanation, ...jobData } = parsed

    const ai_analysis = manual_needed
      ? null
      : JSON.stringify({ summary, requirements, pros, cons, keywords, cover_angle, fit_score, score_breakdown, score_explanation })

    const { error: insertError } = await supabase.from("jobs").insert([{
      ...jobData,
      title: jobData.title || "Oferta guardada sin analizar",
      company: jobData.company || "Empresa pendiente",
      url: parsed.url || jobUrl.trim() || null,
      fit_score: Number.isFinite(Number(fit_score)) ? Number(fit_score) : null,
      ai_analysis,
      status: "saved",
      user_id: user.id,
      cv_profile_id: selectedCv?.id || null
    }])

    if (insertError) {
      console.error(insertError)

      alert(
        `Error guardando oferta:
${insertError.message}`
      )

      setSaving(false)
      return
    }

    setParsed(null)
    setInput("")
    setJobUrl("")
    setShowForm(false)
    setSaving(false)
    fetchJobs()
  }

  async function updateStatus(id: string, status: Job["status"]) {
    await supabase.from("jobs").update({ status }).eq("id", id)
    fetchJobs()
    if (selectedJob?.id === id) setSelectedJob({ ...selectedJob, status })
  }

  async function generateCover() {
    if (!selectedJob) return

    if (!selectedJob.description?.trim()) {
      alert("Añade una descripción real antes de generar la carta.")
      return
    }

    setGeneratingCover(true)

    const res = await fetch("/api/cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: selectedJob.description,
        title: selectedJob.title,
        company: selectedJob.company,
        notes: selectedJob.notes,
        cvProfile: selectedCv
      })
    })

    const { cover } = await res.json()

    await supabase.from("jobs").update({ cover_letter: cover }).eq("id", selectedJob.id)
    setSelectedJob({ ...selectedJob, cover_letter: cover })
    setGeneratingCover(false)
  }

  async function deleteJob(id: string) {
    await supabase.from("jobs").delete().eq("id", id)
    setSelectedJob(null)
    fetchJobs()
  }

  async function updateNotes(notes: string) {
    if (!selectedJob) return
    await supabase.from("jobs").update({ notes }).eq("id", selectedJob.id)
    setSelectedJob({ ...selectedJob, notes })
    setJobs(jobs.map(j => j.id === selectedJob.id ? { ...j, notes } : j))
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter)

  const stats = Object.keys(STATUS_CONFIG).reduce((acc, key) => {
    acc[key] = jobs.filter(j => j.status === key).length
    return acc
  }, {} as Record<string, number>)

  const analysis = selectedJob?.ai_analysis
    ? (() => { try { return JSON.parse(selectedJob.ai_analysis) } catch { return null } })()
    : null

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="text-blue-400 animate-spin" size={32} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-blue-400" size={24} />
          <span className="text-xl font-bold">JobOps</span>
          <span className="text-gray-500 text-sm">por Saquero</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowCvSelector(!showCvSelector)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm transition-colors">
              <FileText size={14} className="text-blue-400" />
              <span className="text-gray-300 max-w-32 truncate">{selectedCv?.name || "Sin CV"}</span>
              <ChevronDown size={14} className="text-gray-500" />
            </button>

            {showCvSelector && (
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 min-w-48">
                {cvProfiles.map(cv => (
                  <button key={cv.id} onClick={() => { setSelectedCv(cv); setShowCvSelector(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-700 transition-colors first:rounded-t-xl last:rounded-b-xl ${selectedCv?.id === cv.id ? "text-blue-400" : "text-gray-300"}`}>
                    {cv.name} {cv.is_default && "⭐"}
                  </button>
                ))}

                <div className="border-t border-gray-700">
                  <button onClick={() => { router.push("/cvs"); setShowCvSelector(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors rounded-b-xl">
                    + Gestionar CVs
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => router.push("/perfil")} className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm transition-colors">
            <User size={16} />
          </button>

          <button onClick={logout} className="flex items-center gap-2 text-gray-600 hover:text-gray-400 text-sm transition-colors">
            <LogOut size={16} />
          </button>

          <button onClick={openNewJobModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Añadir oferta
          </button>
        </div>
      </div>

      <div className="px-6 py-4 grid grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(filter === key ? "all" : key)}
            className={`rounded-lg p-3 text-center transition-all border ${filter === key ? "border-blue-500 bg-gray-800" : "border-gray-800 bg-gray-900 hover:border-gray-700"}`}>
            <div className="text-2xl font-bold">{stats[key] || 0}</div>
            <div className="text-xs text-gray-400 mt-1">{cfg.label}</div>
          </button>
        ))}
      </div>

      {cvProfiles.length === 0 && (
        <div className="mx-6 mb-2 bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-yellow-400">⚡ Crea tu primer CV para que la IA use tus datos reales</p>
          <button onClick={() => router.push("/cvs")} className="text-xs text-yellow-400 hover:text-yellow-300 underline">Crear CV</button>
        </div>
      )}

      <div className="flex h-[calc(100vh-180px)]">
        <div className="w-96 border-r border-gray-800 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin ofertas. ¡Añade la primera!</p>
            </div>
          ) : (
            filtered.map(job => {
              const cfg = STATUS_CONFIG[job.status]
              return (
                <div key={job.id} onClick={() => { setSelectedJob(job); setEditingJob(false) }}
                  className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${selectedJob?.id === job.id ? "bg-gray-900 border-l-2 border-l-blue-500" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{job.title}</div>
                      <div className="text-gray-400 text-xs mt-1">{job.company}</div>
                      {job.location && <div className="text-gray-500 text-xs">{job.location}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      {Number.isFinite(Number(job.fit_score)) && <span className="text-xs text-blue-400 font-bold">{Number(job.fit_score)}%</span>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedJob ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
              <Briefcase size={48} className="opacity-20" />
              <p>Selecciona una oferta para ver los detalles</p>
            </div>
          ) : (
            <div className="p-6 max-w-3xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
                  <p className="text-gray-400 mt-1">{selectedJob.company}{selectedJob.location && ` · ${selectedJob.location}`}</p>

                  {selectedJob.salary && <p className="text-green-400 text-sm mt-1">{selectedJob.salary}</p>}

                  {selectedJob.url && (
                    <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 text-sm hover:underline mt-1">
                      <ExternalLink size={12} /> Ver oferta original
                    </a>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => startEditing(selectedJob)} className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors text-sm">
                    <Edit size={14} /> Editar
                  </button>

                  <button onClick={() => deleteJob(selectedJob.id)} className="flex items-center gap-1 text-gray-600 hover:text-red-400 transition-colors text-sm">
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>

              {editingJob && (
                <div className="bg-gray-900 border border-blue-900/40 rounded-2xl p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Edit size={16} className="text-blue-400" />
                      Editar / completar oferta
                    </h3>

                    <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-300">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Puesto</label>
                      <input value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })}
                        className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Empresa</label>
                      <input value={editData.company} onChange={e => setEditData({ ...editData, company: e.target.value })}
                        className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Ubicación</label>
                      <input value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })}
                        className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">URL</label>
                      <input value={editData.url} onChange={e => setEditData({ ...editData, url: e.target.value })}
                        placeholder="https://..."
                        className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Descripción / texto real de la oferta</label>
                    <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })}
                      placeholder="Pega aquí la descripción real si la oferta no se pudo leer automáticamente..."
                      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-40" />
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Notas</label>
                    <textarea value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })}
                      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-24" />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={saveEditedJob}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl text-sm font-medium">
                      <Save size={14} /> Guardar cambios
                    </button>

                    <button onClick={reanalyzeJob} disabled={parsing || !editData.description.trim()}
                      className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-3 rounded-xl text-sm font-medium">
                      {parsing ? <><Loader2 size={14} className="animate-spin" /> Reanalizando...</> : <><Sparkles size={14} /> Reanalizar con IA</>}
                    </button>

                    <button onClick={cancelEditing}
                      className="bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mb-6 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => updateStatus(selectedJob.id, key as Job["status"])}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${selectedJob.status === key ? cfg.color + " ring-2 ring-offset-1 ring-offset-gray-950 ring-current" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mb-6">
                <button onClick={generateCover} disabled={generatingCover || !selectedJob.description}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  {generatingCover ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Sparkles size={14} /> Generar carta</>}
                </button>
              </div>

              {analysis && (
                <div className="bg-gray-900 rounded-xl p-5 mb-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2"><Sparkles size={16} className="text-purple-400" /> Análisis IA</h3>
                    <span className={`text-2xl font-bold ${analysis.fit_score >= 70 ? "text-green-400" : analysis.fit_score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {Number.isFinite(Number(analysis.fit_score)) ? `${Number(analysis.fit_score)}%` : "—"}
                    </span>
                  </div>

                  {analysis.summary && <p className="text-gray-300 text-sm mb-4">{analysis.summary}</p>}

                  {analysis.score_breakdown && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        ["Stack", analysis.score_breakdown.stack_match],
                        ["Experiencia", analysis.score_breakdown.experience_match],
                        ["Rol", analysis.score_breakdown.role_match],
                        ["Seniority", analysis.score_breakdown.seniority_match],
                        ["Ubicación", analysis.score_breakdown.location_match],
                        ["Idioma", analysis.score_breakdown.language_match],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="bg-gray-950/60 border border-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">{label}</span>
                            <span className="text-xs font-bold text-blue-400">{Number(value)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Number(value)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {analysis.pros && (
                      <div>
                        <div className="text-xs text-green-400 font-medium mb-2">PROS</div>
                        {analysis.pros.map((p: string, i: number) => <div key={i} className="text-xs text-gray-300 mb-1">✓ {p}</div>)}
                      </div>
                    )}

                    {analysis.cons && (
                      <div>
                        <div className="text-xs text-red-400 font-medium mb-2">CONS</div>
                        {analysis.cons.map((c: string, i: number) => <div key={i} className="text-xs text-gray-300 mb-1">✗ {c}</div>)}
                      </div>
                    )}
                  </div>

                  {analysis.score_explanation && (
                    <div className="mb-4 bg-gray-950/60 border border-gray-800 rounded-xl p-4">
                      <div className="text-xs text-purple-400 font-medium mb-2">VEREDICTO HONESTO</div>
                      {analysis.score_explanation.honest_verdict && (
                        <p className="text-sm text-gray-300 mb-3">{analysis.score_explanation.honest_verdict}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-green-400 font-medium mb-2">POR QUÉ SÍ</div>
                          {analysis.score_explanation.why_good?.map((r: string, i: number) => (
                            <div key={i} className="text-xs text-gray-300 mb-1">✓ {r}</div>
                          ))}
                        </div>

                        <div>
                          <div className="text-xs text-red-400 font-medium mb-2">POR QUÉ NO</div>
                          {analysis.score_explanation.why_not?.map((r: string, i: number) => (
                            <div key={i} className="text-xs text-gray-300 mb-1">✕ {r}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {analysis.keywords && (
                    <div className="mb-4">
                      <div className="text-xs text-blue-400 font-medium mb-2">KEYWORDS</div>
                      <div className="flex flex-wrap gap-1">
                        {analysis.keywords.map((k: string, i: number) => <span key={i} className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">{k}</span>)}
                      </div>
                    </div>
                  )}

                  {analysis.cover_angle && (
                    <div className="pt-4 border-t border-gray-800">
                      <div className="text-xs text-purple-400 font-medium mb-2">ENFOQUE PARA LA CARTA</div>
                      <p className="text-xs text-gray-300">{analysis.cover_angle}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedJob.cover_letter && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wide">Carta de presentación</h3>
                  <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedJob.cover_letter}</p>
                    <button onClick={() => navigator.clipboard.writeText(selectedJob.cover_letter || "")}
                      className="flex items-center gap-1 mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      <Copy size={12} /> Copiar
                    </button>
                  </div>
                </div>
              )}

              {selectedJob.description && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wide">Descripción</h3>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedJob.description}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wide">Notas</h3>
                <textarea
                  key={selectedJob.id}
                  defaultValue={selectedJob.notes || ""}
                  onBlur={e => updateNotes(e.target.value)}
                  placeholder="Añade notas sobre esta oferta..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600 resize-none h-32"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl border border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nueva oferta</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">✕</button>
            </div>

            {selectedCv && (
              <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-800/40 rounded-lg px-3 py-2 mb-4">
                <FileText size={14} className="text-blue-400" />
                <span className="text-xs text-blue-300">Analizando con CV: <strong>{selectedCv.name}</strong></span>
              </div>
            )}

            {!parsed ? (
              <>
                <p className="text-sm text-gray-400 mb-4">
                  Puedes guardar una oferta solo con enlace, solo con texto, o con ambas cosas.
                </p>

                <div className="mb-4">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Enlace de la oferta</label>
                  <input
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    placeholder="https://empresa.com/jobs/backend-developer"
                    className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <label className="text-xs text-gray-500 uppercase tracking-wide">Texto manual de la oferta</label>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Pega aquí el texto real de la oferta si la URL no se puede leer..."
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none h-48 mb-4" />

                {parseError && (
                  <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded-lg px-3 py-2 mb-4">⚠️ {parseError}</div>
                )}

                <button onClick={parseJob} disabled={parsing || (!input.trim() && !jobUrl.trim())}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl text-sm font-medium transition-colors">
                  {parsing ? <><Loader2 size={16} className="animate-spin" /> Analizando...</> : <><Sparkles size={16} /> Analizar oferta</>}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-sm flex items-center gap-2 ${parsed.manual_needed ? "text-yellow-400" : "text-green-400"}`}>
                    <Sparkles size={14} /> {parsed.manual_needed ? "Pendiente de texto manual" : "Análisis completado"}
                  </span>
                  <button onClick={() => setParsed(null)} className="text-xs text-gray-500 hover:text-gray-300">Volver</button>
                </div>

                {parsed.manual_needed && (
                  <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-3 text-sm text-yellow-300 mb-4">
                    ⚠️ No se pudo analizar automáticamente. Puedes guardar el enlace y completar los datos después.
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-400">
                      {Number.isFinite(Number(parsed.fit_score)) ? `${Number(parsed.fit_score)}%` : "—"}
                    </span>
                    <span className="text-sm text-gray-400">de encaje con {selectedCv?.name || "tu perfil"}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Puesto</label>
                      <div className="text-sm font-medium mt-0.5">{parsed.title}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Empresa</label>
                      <div className="text-sm font-medium mt-0.5">{parsed.company}</div>
                    </div>
                  </div>

                  {parsed.summary && (
                    <div>
                      <label className="text-xs text-gray-500">Resumen</label>
                      <p className="text-sm text-gray-300 mt-0.5">{parsed.summary}</p>
                    </div>
                  )}

                  {parsed.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {parsed.keywords.map((k: string, i: number) => (
                        <span key={i} className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">{k}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={saveJob} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl text-sm font-medium transition-colors">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : "Guardar oferta"}
                  </button>

                  <button onClick={() => setShowForm(false)}
                    className="px-6 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl text-sm transition-colors">
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}








