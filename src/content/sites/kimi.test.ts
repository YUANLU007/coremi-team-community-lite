// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createKimiAdapter } from './kimi'

describe('Kimi site adapter', () => {
  it('extracts Kimi conversation ids and rejects lookalike hosts', () => {
    expect(createKimiAdapter({ href: 'https://www.kimi.com/chat/abc-123' }).getConversationSnapshot()).toEqual({
      conversationId: 'abc-123',
      conversationUrl: 'https://www.kimi.com/chat/abc-123',
    })
    expect(createKimiAdapter({ href: 'https://www.kimi.com.evil.example/chat/abc-123' }).getConversationSnapshot()).toEqual({})
  })

  it('writes a prompt and clicks the Kimi send button', async () => {
    document.body.innerHTML = `
      <div class="chat-input-editor" contenteditable="true" role="textbox"></div>
      <div class="send-button-container"><button type="button" aria-label="发送"></button></div>
    `
    const editor = document.querySelector<HTMLElement>('.chat-input-editor')!
    const sendButton = document.querySelector<HTMLButtonElement>('button')!
    const clickListener = vi.fn()
    sendButton.addEventListener('click', clickListener)

    await createKimiAdapter({ inputTimeoutMs: 250 }).fillAndSend('你好 Kimi')

    expect(editor.textContent).toBe('你好 Kimi')
    expect(clickListener).toHaveBeenCalledTimes(1)
  })
})
