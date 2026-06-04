import { NextRequest, NextResponse } from "next/server"
import mammoth from "mammoth"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import { requireUser } from "@/lib/supabase-server"

export const runtime = "nodejs"

type SourceType = "pdf" | "docx" | "txt"

function detectSourceType(file: File): SourceType | null {
  const name = file.name.toLowerCase()

  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf"

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx"
  }

  if (file.type === "text/plain" || name.endsWith(".txt")) return "txt"

  return null
}

async function extractTxt(buffer: ArrayBuffer) {
  return new TextDecoder("utf-8").decode(buffer)
}

async function extractDocx(buffer: ArrayBuffer) {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  })

  return result.value
}

async function extractPdf(buffer: ArrayBuffer) {
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    disableFontFace: true,
  }).promise

  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")

    pages.push(text)
  }

  return pages.join("\n\n")
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth.error) return auth.error

  const formData = await req.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No se ha recibido ningún archivo." },
      { status: 400 }
    )
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "El archivo es demasiado grande. Máximo 5MB." },
      { status: 400 }
    )
  }

  const sourceType = detectSourceType(file)

  if (!sourceType) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa PDF, DOCX o TXT." },
      { status: 400 }
    )
  }

  const buffer = await file.arrayBuffer()

  let rawText = ""

  if (sourceType === "pdf") {
    rawText = await extractPdf(buffer)
  }

  if (sourceType === "docx") {
    rawText = await extractDocx(buffer)
  }

  if (sourceType === "txt") {
    rawText = await extractTxt(buffer)
  }

  const cleanedText = rawText
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  const warnings: string[] = []

  if (cleanedText.length < 300) {
    warnings.push(
      "El archivo tiene poco texto extraíble. Puede ser un PDF visual/no ATS-friendly."
    )
  }

  return NextResponse.json({
    success: true,
    source_type: sourceType,
    original_file_name: file.name,
    raw_text: cleanedText,
    text_length: cleanedText.length,
    warnings,
  })
}

