import type { ChatSiteAdapter, ConversationSnapshot } from './types'
import { keepDeepestResponseContainers } from '../responseContainers'
import { findClickableCopyButton, readResponseTextFromCopyAction } from './clipboardCopy'
import { ensureContentEditableText } from './contentEditable'
import { extractMarkdownFromDom } from './domMarkdown'
import { buttonLabelMatches, describeElement, extractCleanTextFromDom, findClosestMatchingAncestor } from './domText'
import { isClickableButton } from './waitForElement'

const CLAUDE_HOSTS = new Set(['claude.ai'])
const DEFAULT_INPUT_TIMEOUT_MS = 18000
const DEFAULT_CLIPBOARD_TIMEOUT_MS = 900
const DEFAULT_CLIPBOARD_POLL_MS = 40

const CLAUDE_SELECTORS = {
  editor:
    '[data-testid="chat-input"][contenteditable], [data-testid="composer-input"][contenteditable], [data-testid="prompt-input"][contenteditable], div.ProseMirror[contenteditable], .ProseMirror[contenteditable], [contenteditable="plaintext-only"], div[contenteditable][data-lexical-editor], div[contenteditable][aria-label*="Claude"], div[contenteditable][aria-label*="Message"], div[contenteditable][aria-label*="Write"], div[contenteditable][aria-label*="Ask"], div[contenteditable][data-placeholder*="Claude"], div[contenteditable][data-placeholder*="Message"], div[contenteditable][data-placeholder*="Ask"], div[contenteditable][data-placeholder*="发送"], div[contenteditable][role="textbox"], [contenteditable][role="textbox"], [contenteditable][enterkeyhint], main [contenteditable], form [contenteditable], section [contenteditable], div[contenteditable], textarea[aria-label*="Claude"], textarea[aria-label*="Message"], textarea[placeholder*="Claude"], textarea[placeholder*="Message"], textarea[placeholder*="Ask"], textarea',
  sendButton:
    [
      'button[data-testid="send-button"]',
      'button[type="submit"]',
      'button[aria-label*="Send Message"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="Submit"]',
      'button[aria-label*="submit"]',
      'button[aria-label*="提交"]',
      'button[aria-label*="发送消息"]',
      'button[title*="Send"]',
      'button[title*="发送"]',
      'button[data-testid*="send"]',
    ].join(', '),
  response: '.font-claude-response',
  copyButton:
    'button[data-testid="action-bar-copy"], [role="group"][aria-label="Message actions"] button[aria-label="Copy"], button[aria-label="Copy"], button[aria-label="复制"]',
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'BUTTON', 'TEXTAREA', 'SVG'])

interface ClaudeAdapterOptions {
  href?: string
  inputTimeoutMs?: number
  clipboardTimeoutMs?: number
  clipboardPollMs?: number
}

export function createClaudeAdapter(options: ClaudeAdapterOptions = {}): ChatSiteAdapter {
  const inputTimeoutMs = options.inputTimeoutMs ?? DEFAULT_INPUT_TIMEOUT_MS
  const clipboardTimeoutMs = options.clipboardTimeoutMs ?? DEFAULT_CLIPBOARD_TIMEOUT_MS
  const clipboardPollMs = options.clipboardPollMs ?? DEFAULT_CLIPBOARD_POLL_MS

  function currentHref(): string {
    return options.href ?? location.href
  }

  function getConversationSnapshot(): ConversationSnapshot {
    return getClaudeConversationLocation(currentHref())
  }

  function getConversationId(): string {
    return getConversationSnapshot().conversationId || '__default__'
  }

  function getResponseContainers(): Element[] {
    return [...document.querySelectorAll(CLAUDE_SELECTORS.response)]
  }

  function getAllAssistantReplies(): string[] {
    return keepDeepestResponseContainers(getResponseContainers()).map(container => extractCleanText(container)).filter(Boolean)
  }

  async function fillAndSend(content: string, autoSend = true): Promise<void> {
    const editor = await waitForClaudeEditor(inputTimeoutMs)

    if (!(await ensureContentEditableText(editor, content))) {
      throw new Error('Claude editor did not accept the prompt text')
    }

    if (!autoSend) return

    await waitForPromptUiToSettle()
    const sendButton = await waitForClaudeSendButton(inputTimeoutMs)
    sendButton.click()
  }

  return {
    id: 'claude',
    getConversationSnapshot,
    getConversationId,
    getResponseContainers,
    getAllAssistantReplies,
    readResponseText: extractCleanText,
    readResponseTextFromCopy: node => readResponseTextFromCopy(node, clipboardTimeoutMs, clipboardPollMs),
    readResponseMarkdown: extractMarkdownFromDom,
    findResponseContainer,
    isGenerating: isClaudeGenerating,
    stopGenerating: stopClaudeGenerating,
    fillAndSend,
    collectPromptDiagnostics,
  }
}

export function getClaudeConversationLocation(href: string): ConversationSnapshot {
  const url = parseSafeClaudeUrl(href)
  if (!url) return {}

  return {
    conversationId: extractConversationId(url),
    conversationUrl: url.href,
  }
}

function parseSafeClaudeUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    return url.protocol === 'https:' && CLAUDE_HOSTS.has(url.hostname) ? url : undefined
  } catch {
    return undefined
  }
}

function extractConversationId(url: URL): string | undefined {
  if (!url.pathname.startsWith('/chat/')) return undefined

  const conversationId = url.pathname.slice('/chat/'.length).split('/')[0]
  return conversationId ? decodeURIComponent(conversationId) : undefined
}

function collectPromptDiagnostics(): Record<string, unknown> {
  return {
    href: location.href,
    readyState: document.readyState,
    visibilityState: document.visibilityState,
    title: document.title,
    editorMatches: querySelectorAllDeep<HTMLElement>(CLAUDE_SELECTORS.editor).slice(0, 5).map(describeElement),
    sendButtonMatches: querySelectorAllDeep<HTMLButtonElement>(CLAUDE_SELECTORS.sendButton).slice(0, 5).map(describeElement),
    likelySendButton: findClaudeSendButton() ? describeElement(findClaudeSendButton() as Element) : undefined,
    visibleButtonSamples: querySelectorAllDeep<HTMLButtonElement>('button').slice(0, 12).map(describeElement),
  }
}

function extractCleanText(node: Node): string {
  return extractCleanTextFromDom(node, { skipTags: SKIP_TAGS })
}

function findResponseContainer(element: Element | null): Element | null {
  return findClosestMatchingAncestor(element, CLAUDE_SELECTORS.response)
}

async function readResponseTextFromCopy(node: Node, timeoutMs: number, pollMs: number): Promise<string | undefined> {
  return readResponseTextFromCopyAction({ node, timeoutMs, pollMs, findCopyButton })
}

function findCopyButton(response: Element): HTMLButtonElement | undefined {
  let scope: Element | null = response
  while (scope && scope !== document.body) {
    const copyButton = findClickableCopyButton(scope, CLAUDE_SELECTORS.copyButton)
    if (copyButton) return copyButton
    scope = scope.parentElement
  }

  return findClickableCopyButton(document.body, CLAUDE_SELECTORS.copyButton)
}

function isClaudeGenerating(): boolean {
  return Boolean(findClaudeStopButton())
}

async function stopClaudeGenerating(): Promise<boolean> {
  const button = findClaudeStopButton()
  if (!button) return false
  button.click()
  return true
}

function findClaudeStopButton(): HTMLButtonElement | undefined {
  return querySelectorAllDeep<HTMLButtonElement>('button').find(button => buttonLabelMatches(button, /stop|stopping|停止|中止/) && isClickableButton(button))
}

function waitForClaudeEditor(timeoutMs: number): Promise<HTMLElement> {
  const immediate = querySelectorAllDeep<HTMLElement>(CLAUDE_SELECTORS.editor).find(isUsableClaudeEditor)
  if (immediate) return Promise.resolve(immediate)

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const editor = querySelectorAllDeep<HTMLElement>(CLAUDE_SELECTORS.editor).find(isUsableClaudeEditor)
      if (editor) {
        window.clearInterval(timer)
        resolve(editor)
        return
      }
      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer)
        reject(new Error(`Element not found: ${CLAUDE_SELECTORS.editor}`))
      }
    }, 250)
  })
}

function isUsableClaudeEditor(editor: HTMLElement): boolean {
  if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) return !editor.disabled
  const contentEditable = editor.getAttribute('contenteditable')
  return editor.isContentEditable || contentEditable === 'true' || contentEditable === '' || contentEditable === 'plaintext-only'
}

function waitForClaudeSendButton(timeoutMs: number): Promise<HTMLButtonElement> {
  const immediate = findClaudeSendButton()
  if (immediate) return Promise.resolve(immediate)

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const button = findClaudeSendButton()
      if (button) {
        window.clearInterval(timer)
        resolve(button)
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer)
        reject(new Error('Claude 发送按钮暂不可用，请稍后重试'))
      }
    }, 250)
  })
}

function findClaudeSendButton(): HTMLButtonElement | undefined {
  const selectorMatches = querySelectorAllDeep<HTMLButtonElement>(CLAUDE_SELECTORS.sendButton)
  const directMatch = selectorMatches.find(isClaudeSendButton)
  if (directMatch) return directMatch

  return querySelectorAllDeep<HTMLButtonElement>('button').find(isClaudeSendButton)
}

function isClaudeSendButton(button: HTMLButtonElement): boolean {
  if (!isClickableButton(button)) return false

  const explicitLabel = [
    button.getAttribute('aria-label'),
    button.getAttribute('title'),
    button.getAttribute('data-testid'),
  ].filter(Boolean).join(' ').toLowerCase()
  if (/send|submit|发送|提交|arrow_upward|paper_plane|send_/.test(explicitLabel)) return true

  const label = getClaudeButtonSearchText(button)
  if (/(stop|stopping|停止|中止|cancel|取消|mic|microphone|voice|语音|attach|upload|上传|附件|menu|more|settings|history)/.test(label)) {
    return false
  }

  return /send|submit|发送|提交|arrow_upward|paper_plane|send_/.test(label)
}

function getClaudeButtonSearchText(button: Element): string {
  const element = button as HTMLElement
  const className = typeof element.className === 'string' ? element.className : ''
  const childLabels = [...button.querySelectorAll('[aria-label], [title], svg, path')]
    .map(child => [child.getAttribute('aria-label'), child.getAttribute('title'), child.textContent].filter(Boolean).join(' '))
    .join(' ')

  return [
    button.getAttribute('aria-label'),
    button.getAttribute('title'),
    button.getAttribute('data-testid'),
    className,
    button.textContent,
    childLabels,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function waitForPromptUiToSettle(): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, 150))
}

function querySelectorAllDeep<T extends Element>(selector: string, root: Document | ShadowRoot = document): T[] {
  const matches = [...root.querySelectorAll<T>(selector)]
  for (const element of root.querySelectorAll<HTMLElement>('*')) {
    if (element.shadowRoot) matches.push(...querySelectorAllDeep<T>(selector, element.shadowRoot))
  }
  return matches
}
