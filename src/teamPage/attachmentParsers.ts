import type { MessageAttachment } from '../group/types'

const DOCX_TEXT_PARTS = new Set([
  'word/document.xml',
  'word/footnotes.xml',
  'word/endnotes.xml',
  'word/comments.xml',
])

export async function extractAttachmentText(file: File, kind: MessageAttachment['kind']): Promise<string | undefined> {
  if (kind === 'text') return file.text()
  if (kind === 'document') {
    if (/\.docx$/i.test(file.name)) return extractDocxText(file)
    if (/\.rtf$/i.test(file.name)) return stripRtf(await file.text())
    return undefined
  }
  if (kind === 'pdf') return extractPdfTextRough(await file.arrayBuffer())
  return undefined
}

export async function extractDocxText(file: File): Promise<string | undefined> {
  const entries = await readZipEntries(await file.arrayBuffer())
  const parts = await Promise.all(
    [...DOCX_TEXT_PARTS]
      .map(name => entries.get(name))
      .filter((entry): entry is ZipEntry => Boolean(entry))
      .map(entry => readZipEntryText(entry)),
  )
  return extractDocxTextFromXmlParts(parts)
}

export function extractDocxTextFromXmlParts(parts: string[]): string | undefined {
  const paragraphs: string[] = []
  const parser = typeof DOMParser === 'undefined' ? undefined : new DOMParser()
  for (const xml of parts) {
    const parsed = parser?.parseFromString(xml, 'application/xml')
    const xmlParagraphs = parsed ? [...parsed.getElementsByTagName('w:p')] : []
    if (xmlParagraphs.length === 0) {
      paragraphs.push(...extractXmlParagraphs(xml))
      continue
    }
    for (const paragraph of xmlParagraphs) {
      const runs = [...paragraph.getElementsByTagName('w:t'), ...paragraph.getElementsByTagName('a:t')]
        .map(node => node.textContent ?? '')
        .join('')
        .trim()
      if (runs) paragraphs.push(runs)
    }
  }
  const text = paragraphs.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return text || undefined
}

export function extractPdfTextRoughFromString(source: string): string | undefined {
  const chunks: string[] = []
  const stringPattern = /\((?:\\.|[^\\)])*\)\s*Tj|\[(?:[\s\S]*?)\]\s*TJ/g
  for (const match of source.matchAll(stringPattern)) {
    const value = match[0]
    for (const literal of value.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      chunks.push(decodePdfLiteral(literal[0].slice(1, -1)))
    }
    if (value.endsWith('TJ')) chunks.push('\n')
  }
  const hexPattern = /<([0-9A-Fa-f\s]{4,})>\s*Tj/g
  for (const match of source.matchAll(hexPattern)) chunks.push(decodePdfHex(match[1]))
  const text = chunks.join(' ').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return text || undefined
}

interface ZipEntry {
  name: string
  method: number
  compressed: Uint8Array
}

async function readZipEntries(buffer: ArrayBuffer): Promise<Map<string, ZipEntry>> {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const eocdOffset = findEndOfCentralDirectory(view)
  if (eocdOffset < 0) throw new Error('无法读取 Word 文件：不是有效的 docx zip')
  const entryCount = view.getUint16(eocdOffset + 10, true)
  let cursor = view.getUint32(eocdOffset + 16, true)
  const entries = new Map<string, ZipEntry>()
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break
    const method = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const name = decodeUtf8(bytes.slice(cursor + 46, cursor + 46 + nameLength))
    const localNameLength = view.getUint16(localHeaderOffset + 26, true)
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true)
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
    entries.set(name, {
      name,
      method,
      compressed: bytes.slice(dataStart, dataStart + compressedSize),
    })
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function readZipEntryText(entry: ZipEntry): Promise<string> {
  if (entry.method === 0) return decodeUtf8(entry.compressed)
  if (entry.method !== 8) throw new Error(`无法读取 ${entry.name}：不支持的压缩格式`)
  const compressedBuffer = entry.compressed.buffer.slice(entry.compressed.byteOffset, entry.compressed.byteOffset + entry.compressed.byteLength) as ArrayBuffer
  const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const decompressed = await new Response(stream).arrayBuffer()
  return decodeUtf8(new Uint8Array(decompressed))
}

function findEndOfCentralDirectory(view: DataView): number {
  for (let offset = view.byteLength - 22; offset >= Math.max(0, view.byteLength - 66_000); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  return -1
}

function extractPdfTextRough(buffer: ArrayBuffer): string | undefined {
  const source = Array.from(new Uint8Array(buffer), byte => String.fromCharCode(byte)).join('')
  return extractPdfTextRoughFromString(source)
}

function extractXmlTextRuns(xml: string): string[] {
  return [...xml.matchAll(/<(?:w|a):t\b[^>]*>([\s\S]*?)<\/(?:w|a):t>/g)].map(match => decodeXml(match[1]))
}

function extractXmlParagraphs(xml: string): string[] {
  const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)]
    .map(match => extractXmlTextRuns(match[0]).join('').trim())
    .filter(Boolean)
  return paragraphs.length > 0 ? paragraphs : [extractXmlTextRuns(xml).join('').trim()].filter(Boolean)
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function stripRtf(value: string): string | undefined {
  const text = value
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+\d* ?/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return text || undefined
}

function decodePdfLiteral(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)))
}

function decodePdfHex(value: string): string {
  const normalized = value.replace(/\s/g, '')
  const bytes: number[] = []
  for (let index = 0; index < normalized.length - 1; index += 2) {
    bytes.push(Number.parseInt(normalized.slice(index, index + 2), 16))
  }
  return decodeUtf8(new Uint8Array(bytes)).replace(/\0/g, '')
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes)
}
