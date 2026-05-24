import { describe, expect, it } from 'vitest'
import { extractDocxTextFromXmlParts, extractPdfTextRoughFromString } from './attachmentParsers'

describe('attachment parsers', () => {
  it('extracts paragraph text from docx XML parts', () => {
    const text = extractDocxTextFromXmlParts([
      `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>第一段</w:t></w:r><w:r><w:t>正文</w:t></w:r></w:p>
          <w:p><w:r><w:t>第二段 &amp; 事实</w:t></w:r></w:p>
        </w:body>
      </w:document>`,
    ])

    expect(text).toBe('第一段正文\n第二段 & 事实')
  })

  it('extracts simple literal text from PDF text operators', () => {
    const text = extractPdfTextRoughFromString('BT /F1 12 Tf (Hello\\040Coremi) Tj [(Next) 120 ( line)] TJ ET')

    expect(text).toContain('Hello Coremi')
    expect(text).toContain('Next')
    expect(text).toContain('line')
  })
})
