Copy-Item .\src\app\page.tsx .\src\app\page.backup.tsx
Copy-Item .\src\app\api\parse-job\route.ts .\src\app\api\parse-job\route.backup.ts

# 1) parse-job devuelve la URL original si el input era URL
(Get-Content .\src\app\api\parse-job\route.ts -Raw) `
-replace 'return NextResponse\.json\(\{ \.\.\.data, scraped, scrape_error: scrapeError \}\)', 'return NextResponse.json({ ...data, url: isUrl ? input.trim() : (data.url || null), scraped, scrape_error: scrapeError })' |
Set-Content -Encoding UTF8 .\src\app\api\parse-job\route.ts

# 2) page.tsx: estado para URL separada
(Get-Content .\src\app\page.tsx -Raw) `
-replace 'const \[input, setInput\] = useState\(""\)', 'const [input, setInput] = useState("")
  const [jobUrl, setJobUrl] = useState("")' `
-replace 'if \(!input\.trim\(\)\) return', 'if (!input.trim() && !jobUrl.trim()) return' `
-replace 'body: JSON\.stringify\(\{ input: input\.trim\(\), cvProfile: selectedCv \}\)', 'body: JSON.stringify({ input: jobUrl.trim() || input.trim(), cvProfile: selectedCv })' `
-replace 'setParsed\(data\)', 'setParsed({ ...data, url: data.url || jobUrl.trim() || null })' `
-replace '\.\.\.jobData, fit_score, ai_analysis, status: "saved",', '...jobData, url: parsed.url || jobUrl.trim() || null, fit_score, ai_analysis, status: "saved",' `
-replace 'setInput\(""\)', 'setInput("")
    setJobUrl("")' `
-replace 'setSelectedJob\(\{ \.\.\.selectedJob, notes \}\)', 'setSelectedJob({ ...selectedJob, notes })
    setJobs(jobs.map(j => j.id === selectedJob.id ? { ...j, notes } : j))' |
Set-Content -Encoding UTF8 .\src\app\page.tsx

# 3) Reset URL al abrir modal
(Get-Content .\src\app\page.tsx -Raw) `
-replace 'setShowForm\(true\); setParsed\(null\); setInput\(""\); setParseError\(null\)', 'setShowForm(true); setParsed(null); setInput(""); setJobUrl(""); setParseError(null)' |
Set-Content -Encoding UTF8 .\src\app\page.tsx

# 4) Meter campo URL en el modal antes del textarea
(Get-Content .\src\app\page.tsx -Raw) `
-replace '<p className="text-sm text-gray-400 mb-4">\s*Pega la <span className="text-blue-400">URL</span> de la oferta o el <span className="text-blue-400">texto completo</span>\.\s*</p>\s*<textarea value=\{input\}', @'
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

                <label className="text-xs text-gray-500 uppercase tracking-wide">Texto de la oferta</label>
                <textarea value={input}
' |
Set-Content -Encoding UTF8 .\src\app\page.tsx

# 5) Botón analizar activo si hay URL o texto
(Get-Content .\src\app\page.tsx -Raw) `
-replace 'disabled=\{parsing \|\| !input\.trim\(\)\}', 'disabled={parsing || (!input.trim() && !jobUrl.trim())}' |
Set-Content -Encoding UTF8 .\src\app\page.tsx

# 6) Forzar que la nota cambie por oferta seleccionada
(Get-Content .\src\app\page.tsx -Raw) `
-replace '<textarea\s*defaultValue=\{selectedJob\.notes \|\| ""\}', '<textarea
                  key={selectedJob.id}
                  defaultValue={selectedJob.notes || ""}' |
Set-Content -Encoding UTF8 .\src\app\page.tsx

npm run build