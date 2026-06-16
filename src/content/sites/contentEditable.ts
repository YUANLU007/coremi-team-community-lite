export function setContentEditableText(editor: HTMLElement, content: string): void {
  editor.focus()

  if (tryInsertTextCommand(editor, content)) {
    editor.dispatchEvent(new Event('change', { bubbles: true }))
    return
  }

  editor.replaceChildren()

  editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: content }))

  const block = document.createElement('p')
  block.textContent = content
  editor.append(block)

  editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: content }))
  editor.dispatchEvent(new Event('change', { bubbles: true }))
}

export function readEditorText(editor: HTMLElement, options: { normalizeNbsp?: boolean } = {}): string {
  const raw = editor.innerText || editor.textContent || ''
  const text = options.normalizeNbsp ? raw.replace(/\u00a0/g, ' ') : raw
  return text.trim()
}

function tryInsertTextCommand(editor: HTMLElement, content: string): boolean {
  if (typeof document.execCommand !== 'function') return false

  const selection = window.getSelection()
  if (!selection) return false

  try {
    const range = document.createRange()
    range.selectNodeContents(editor)
    selection.removeAllRanges()
    selection.addRange(range)
    const inserted = document.execCommand('insertText', false, content)
    selection.removeAllRanges()
    return inserted && readEditorText(editor, { normalizeNbsp: true }).length > 0
  } catch {
    selection.removeAllRanges()
    return false
  }
}
