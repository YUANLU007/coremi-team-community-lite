import type { ChatSiteAdapter, ConversationSnapshot } from './types'
import { keepDeepestResponseContainers } from '../responseContainers'
import { readResponseTextFromCopyAction, findClickableCopyButton } from './clipboardCopy'
import { readEditorText, setContentEditableText } from './contentEditable'
import { extractMarkdownFromDom } from './domMarkdown'
import { describeElement, extractCleanTextFromDom, findClosestMatchingAncestor } from './domText'
import { isClickableButton, waitForElement } from './waitForElement'

const GEMINI_ORIGIN = 'https://gemini.google.com'
const GEMINI_HOME_URL = `${GEMINI_ORIGIN}/`
const GEMINI_APP_PREFIX = '/app/'
const DEFAULT_INPUT_TIMEOUT_MS = 9000
const DEFAULT_CLIPBOARD_TIMEOUT_MS = 900
const DEFAULT_CLIPBOARD_POLL_MS = 40

const GEMINI_SELECTORS = {
  editor: 'div.ql-editor[contenteditable="true"], rich-textarea div[contenteditable="true"]',
  sendButton:
    [
      'button.send-button',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="提交"]',
      'button[aria-label*="送出"]',
      'button[title*="Send"]',
      'button[title*="发送"]',
      'button[mattooltip*="Send"]',
      'button[mattooltip*="发送"]',
      'button[data-test-id*="send"]',
    ].join(', '),
  response: 'model-response, .model-response-text, message-content',
  copyButton:
    'button[data-test-id="copy-button"], copy-button button, button[mattooltip="复制回答"], button[aria-label="复制"], button[aria-label*="Copy"], button[aria-label*="复制"]',
  turn: 'model-response',
}

const SKIP_TAGS = new Set([
  'MAT-ICON',
  'SCRIPT',
  'STYLE',
  'BUTTON',
  'MS-THOUGHT-CHUNK',
  'MAT-EXPANSION-PANEL-HEADER',
])

interface GeminiAdapterOptions {
  href?: string
  inputTimeoutMs?: number
  clipboardTimeoutMs?: number
  clipboardPollMs?: number
}

export function createGeminiAdapter(options: GeminiAdapterOptions = {}): ChatSiteAdapter {
  const inputTimeoutMs = options.inputTimeoutMs ?? DEFAULT_INPUT_TIMEOUT_MS
  const clipboardTimeoutMs = options.clipboardTimeoutMs ?? DEFAULT_CLIPBOARD_TIMEOUT_MS
  const clipboardPollMs = options.clipboardPollMs ?? DEFAULT_CLIPBOARD_POLL_MS

  function currentHref(): string {
    return options.href ?? location.href
  }

  function getConversationSnapshot(): ConversationSnapshot {
    return getGeminiConversationLocation(currentHref())
  }

  function getConversationId(): string {
    return getConversationSnapshot().conversationId || '__default__'
  }

  function getResponseContainers(): Element[] {
    return [...document.querySelectorAll(GEMINI_SELECTORS.response)]
  }

  function getAllAssistantReplies(): string[] {
    return keepDeepestResponseContainers(getResponseContainers()).map(container => extractCleanText(container)).filter(Boolean)
  }

  async function fillAndSend(content: string, autoSend = true): Promise<void> {
    const editor = await waitForElement(GEMINI_SELECTORS.editor, inputTimeoutMs)

    setContentEditableText(editor, content)
    if (readEditorText(editor) !== content.trim()) {
      throw new Error('Gemini editor did not accept the prompt text')
    }

    if (!autoSend) return

    const sendButton = await waitForGeminiSendButton(inputTimeoutMs)
    sendButton.click()
  }

  return {
    id: 'gemini',
    getConversationSnapshot,
    getConversationId,
    getResponseContainers,
    getAllAssistantReplies,
    readResponseText: extractCleanText,
    readResponseTextFromCopy: node => readResponseTextFromCopy(node, clipboardTimeoutMs, clipboardPollMs),
    readResponseMarkdown: extractMarkdownFromDom,
    findResponseContainer,
    isGenerating: isGeminiGenerating,
    stopGenerating: stopGeminiGenerating,
    fillAndSend,
    collectPromptDiagnostics,
  }
}

export function getGeminiConversationLocation(href: string): ConversationSnapshot {
  const url = parseSafeGeminiUrl(href)
  if (!url) return {}

  return {
    conversationId: extractConversationId(url),
    conversationUrl: url.href,
  }
}

function parseSafeGeminiUrl(value: string | undefined): URL | undefined {
  if (!value || !value.startsWith(GEMINI_HOME_URL)) return undefined

  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'gemini.google.com' ? url : undefined
  } catch {
    return undefined
  }
}

function extractConversationId(url: URL): string | undefined {
  if (!url.pathname.startsWith(GEMINI_APP_PREFIX)) return undefined

  const conversationId = url.pathname.slice(GEMINI_APP_PREFIX.length).split('/')[0]
  return conversationId ? decodeURIComponent(conversationId) : undefined
}

function collectPromptDiagnostics(): Record<string, unknown> {
  return {
    href: location.href,
    readyState: document.readyState,
    visibilityState: document.visibilityState,
    title: document.title,
    editorMatches: [...document.querySelectorAll(GEMINI_SELECTORS.editor)].slice(0, 5).map(describeElement),
    sendButtonMatches: [...document.querySelectorAll(GEMINI_SELECTORS.sendButton)].slice(0, 5).map(describeElement),
    likelySendButton: findGeminiSendButton() ? describeElement(findGeminiSendButton() as Element) : undefined,
    visibleButtonSamples: [...document.querySelectorAll('button')].slice(0, 12).map(describeElement),
  }
}

function extractCleanText(node: Node): string {
  return extractCleanTextFromDom(node, { skipTags: SKIP_TAGS })
}

function findResponseContainer(element: Element | null): Element | null {
  return findClosestMatchingAncestor(element, GEMINI_SELECTORS.response)
}

async function readResponseTextFromCopy(node: Node, timeoutMs: number, pollMs: number): Promise<string | undefined> {
  return readResponseTextFromCopyAction({ node, timeoutMs, pollMs, findCopyButton })
}

function findCopyButton(response: Element): HTMLButtonElement | undefined {
  const turn = response.closest(GEMINI_SELECTORS.turn) ?? response.parentElement
  return findClickableCopyButton(turn, GEMINI_SELECTORS.copyButton)
}

function isGeminiGenerating(): boolean {
  return Boolean(findGeminiStopButton())
}

async function stopGeminiGenerating(): Promise<boolean> {
  const button = findGeminiStopButton()
  if (!button) return false
  button.click()
  return true
}

function findGeminiStopButton(): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => {
    return isClickableButton(button) && /stop|stopping|停止|中止/.test(getGeminiButtonSearchText(button))
  })
}

function waitForGeminiSendButton(timeoutMs: number): Promise<HTMLButtonElement> {
  const immediate = findGeminiSendButton()
  if (immediate) return Promise.resolve(immediate)

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const button = findGeminiSendButton()
      if (button) {
        window.clearInterval(timer)
        resolve(button)
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer)
        reject(new Error('Gemini 发送按钮暂不可用，请稍后重试'))
      }
    }, 250)
  })
}

function findGeminiSendButton(): HTMLButtonElement | undefined {
  const selectorMatches = [...document.querySelectorAll<HTMLButtonElement>(GEMINI_SELECTORS.sendButton)]
  const directMatch = selectorMatches.find(isGeminiSendButton)
  if (directMatch) return directMatch

  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(isGeminiSendButton)
}

function isGeminiSendButton(button: HTMLButtonElement): boolean {
  if (!isClickableButton(button)) return false

  const label = getGeminiButtonSearchText(button)
  if (/(stop|stopping|停止|中止|cancel|取消|mic|microphone|voice|语音|attach|upload|上传|附件|menu|more|settings|history)/.test(label)) {
    return false
  }

  return /send|submit|发送|提交|送出|arrow_upward/.test(label)
}

function getGeminiButtonSearchText(button: Element): string {
  const element = button as HTMLElement
  const className = typeof element.className === 'string' ? element.className : ''
  const childLabels = [...button.querySelectorAll('[aria-label], [title], mat-icon, .mat-icon')]
    .map(child => [child.getAttribute('aria-label'), child.getAttribute('title'), child.textContent].filter(Boolean).join(' '))
    .join(' ')

  return [
    button.getAttribute('aria-label'),
    button.getAttribute('title'),
    button.getAttribute('mattooltip'),
    button.getAttribute('data-test-id'),
    className,
    button.textContent,
    childLabels,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
