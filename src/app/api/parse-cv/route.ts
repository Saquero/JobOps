import { NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"

export const runtime = "nodejs"

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
  pdfjsLib.GlobalWorkerOptions.workerSrc = ""

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true })
  const pdf = await loadingTask.promise

  let fullText = ""
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join(" ")
    fullText += pageText + "\n"
  }

  return fullText
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = file.name.toLowerCase()

    let text = ""

    if (fileName.endsWith(".pdf")) {
      text = await parsePdf(buffer)
    } else if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8")
    } else {
      return NextResponse.json({ error: "Formato no soportado. Usa PDF, DOCX o TXT." }, { status: 400 })
    }

    const cleaned = text.replace(/\s+/g, " ").trim()

    if (!cleaned || cleaned.length < 50) {
      return NextResponse.json({ error: "No se pudo extraer texto del archivo." }, { status: 400 })
    }

    return NextResponse.json({ text: cleaned })
  } catch (err) {
    return NextResponse.json({ error: "Error al procesar el archivo.", details: String(err) }, { status: 500 })
  }
}