export function setContentEditableText(editor: HTMLElement, content: string): void {
  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    editor.focus()
    editor.value = content
    editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: content }))
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }))
    editor.dispatchEvent(new Event('change', { bubbles: true }))
    return
  }

  editor.focus()

  if (typeof document.execCommand !== 'function') {
    forceDomContentEditableText(editor, content)
    return
  }

  const selection = window.getSelection()
  if (selection) {
    const range = document.createRange()
    range.selectNodeContents(editor)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  document.execCommand('insertText', false, content)

  editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: content }))
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }))
  editor.dispatchEvent(new Event('change', { bubbles: true }))

  if (normalizeEditorTextForCompare(readEditorText(editor, { normalizeNbsp: true })) === normalizeEditorTextForCompare(content)) return

  editor.focus()
  editor.replaceChildren()

  for (const line of content.split('\n')) {
    const block = document.createElement('p')
    block.textContent = line || '\u00a0'
    editor.append(block)
  }

  editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: content }))
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }))
  editor.dispatchEvent(new Event('change', { bubbles: true }))
}

export async function ensureContentEditableText(editor: HTMLElement, content: string): Promise<boolean> {
  setContentEditableText(editor, content)
  await waitForEditorMutation()
  if (editorTextMatchesContent(editor, content)) return true

  pasteContentEditableText(editor, content)
  await waitForEditorMutation()
  if (editorTextMatchesContent(editor, content)) return true

  forceDomContentEditableText(editor, content)
  await waitForEditorMutation()
  return editorTextMatchesContent(editor, content)
}

export function readEditorText(editor: HTMLElement, options: { normalizeNbsp?: boolean } = {}): string {
  const raw = editor.innerText || editor.textContent || ''
  const text = options.normalizeNbsp ? raw.replace(/\u00a0/g, ' ') : raw
  return text.trim()
}

export function normalizeEditorTextForCompare(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function editorTextMatchesContent(editor: HTMLElement, content: string): boolean {
  const actual = normalizeEditorTextForCompare(readEditorText(editor, { normalizeNbsp: true }))
  const expected = normalizeEditorTextForCompare(content)
  if (!actual || !expected) return actual === expected
  if (actual === expected) return true
  if (actual.includes(expected)) return true

  // Some editors expose only a truncated first paragraph through innerText while
  // their internal state has already accepted the full prompt.
  return expected.includes(actual) && actual.length >= Math.min(80, Math.floor(expected.length * 0.8))
}

function pasteContentEditableText(editor: HTMLElement, content: string): void {
  editor.focus()
  selectEditorContents(editor)

  const clipboardData = new DataTransfer()
  clipboardData.setData('text/plain', content)
  clipboardData.setData('text/html', content.split('\n').map(line => `<p>${escapeHtml(line || '\u00a0')}</p>`).join(''))
  editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
  editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertFromPaste', data: content }))
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: content }))
  editor.dispatchEvent(new Event('change', { bubbles: true }))
}

function forceDomContentEditableText(editor: HTMLElement, content: string): void {
  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
    editor.value = content
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }))
    editor.dispatchEvent(new Event('change', { bubbles: true }))
    return
  }

  editor.focus()
  editor.replaceChildren()
  for (const line of content.split('\n')) {
    const block = document.createElement('p')
    block.textContent = line || '\u00a0'
    editor.append(block)
  }
  editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: content }))
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }))
  editor.dispatchEvent(new Event('change', { bubbles: true }))
}

function selectEditorContents(editor: HTMLElement): void {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(editor)
  selection.removeAllRanges()
  selection.addRange(range)
}

function waitForEditorMutation(): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, 80))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
