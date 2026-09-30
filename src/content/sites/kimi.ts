import type { ChatSiteAdapter, ConversationSnapshot } from './types'
import { keepDeepestResponseContainers } from '../responseContainers'
import { ensureContentEditableText } from './contentEditable'
import { extractMarkdownFromDom } from './domMarkdown'
import { buttonLabelMatches, describeElement, extractCleanTextFromDom, findClosestMatchingAncestor } from './domText'
import { isClickableButton, waitForElement } from './waitForElement'

const KIMI_HOSTS = new Set(['www.kimi.com', 'kimi.com'])
const DEFAULT_INPUT_TIMEOUT_MS = 18000

const KIMI_SELECTORS = {
  editor: [
    '.chat-input-editor[contenteditable="true"]',
    '[data-lexical-editor="true"][contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"][enterkeyhint]',
    'main [contenteditable="true"]',
    'form [contenteditable="true"]',
    'div[contenteditable="true"]',
    'textarea',
  ].join(', '),
  sendButton: [
    '.send-button-container button',
    '.send-button-container [role="button"]',
    'button[data-testid*="send"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button[aria-label*="发送"]',
    'button[title*="Send"]',
    'button[title*="发送"]',
    'button[class*="send"]',
  ].join(', '),
  response: [
    '.chat-content-item-assistant .markdown-container:not(.toolcall-content-text) > .markdown',
    '.chat-content-item-assistant .markdown-container:not(.toolcall-content-text)',
    '[class*="chat-content-item-assistant"] [class*="markdown"]',
    '[class*="chat-content-item-assistant"]',
  ].join(', '),
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'BUTTON', 'TEXTAREA', 'SVG'])

interface KimiAdapterOptions {
  href?: string
  inputTimeoutMs?: number
}

export function createKimiAdapter(options: KimiAdapterOptions = {}): ChatSiteAdapter {
  const inputTimeoutMs = options.inputTimeoutMs ?? DEFAULT_INPUT_TIMEOUT_MS

  function currentHref(): string {
    return options.href ?? location.href
  }

  function getConversationSnapshot(): ConversationSnapshot {
    return getKimiConversationLocation(currentHref())
  }

  function getConversationId(): string {
    return getConversationSnapshot().conversationId || '__default__'
  }

  function getResponseContainers(): Element[] {
    return keepDeepestResponseContainers([...document.querySelectorAll(KIMI_SELECTORS.response)])
  }

  function getAllAssistantReplies(): string[] {
    return getResponseContainers().map(container => extractCleanText(container)).filter(Boolean)
  }

  async function fillAndSend(content: string, autoSend = true): Promise<void> {
    const editor = await waitForElement(KIMI_SELECTORS.editor, inputTimeoutMs)
    if (!(await ensureContentEditableText(editor, content))) {
      throw new Error('Kimi editor did not accept the prompt text')
    }

    if (!autoSend) return

    const sendButton = await waitForKimiSendButton(inputTimeoutMs)
    sendButton.click()
  }

  return {
    id: 'kimi',
    getConversationSnapshot,
    getConversationId,
    getResponseContainers,
    getAllAssistantReplies,
    readResponseText: extractCleanText,
    readResponseMarkdown: extractMarkdownFromDom,
    findResponseContainer,
    isGenerating: isKimiGenerating,
    stopGenerating: stopKimiGenerating,
    fillAndSend,
    collectPromptDiagnostics,
  }
}

export function getKimiConversationLocation(href: string): ConversationSnapshot {
  const url = parseSafeKimiUrl(href)
  if (!url) return {}

  const match = url.pathname.match(/^\/chat\/([^/]+)/)
  const conversationId = match?.[1]
  return {
    conversationId: conversationId ? decodeURIComponent(conversationId) : undefined,
    conversationUrl: url.href,
  }
}

function parseSafeKimiUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && KIMI_HOSTS.has(url.hostname) ? url : undefined
  } catch {
    return undefined
  }
}

function extractCleanText(node: Node): string {
  return extractCleanTextFromDom(node, { skipTags: SKIP_TAGS })
}

function findResponseContainer(element: Element | null): Element | null {
  return findClosestMatchingAncestor(element, KIMI_SELECTORS.response)
}

function collectPromptDiagnostics(): Record<string, unknown> {
  return {
    href: location.href,
    readyState: document.readyState,
    visibilityState: document.visibilityState,
    title: document.title,
    editorMatches: [...document.querySelectorAll(KIMI_SELECTORS.editor)].slice(0, 5).map(describeElement),
    sendButtonMatches: [...document.querySelectorAll(KIMI_SELECTORS.sendButton)].slice(0, 5).map(describeElement),
    visibleButtonSamples: [...document.querySelectorAll('button, [role="button"]')].slice(0, 12).map(describeElement),
  }
}

function waitForKimiSendButton(timeoutMs: number): Promise<HTMLElement> {
  const immediate = findKimiSendButton()
  if (immediate) return Promise.resolve(immediate)

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const button = findKimiSendButton()
      if (button) {
        window.clearInterval(timer)
        resolve(button)
        return
      }
      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer)
        reject(new Error('Kimi 发送按钮暂不可用，请稍后重试'))
      }
    }, 250)
  })
}

function findKimiSendButton(): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(KIMI_SELECTORS.sendButton)].find(isClickableKimiButton)
}

function isClickableKimiButton(element: HTMLElement): boolean {
  if (element.getAttribute('aria-disabled') === 'true') return false
  if (element instanceof HTMLButtonElement) return isClickableButton(element)
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.pointerEvents !== 'none'
}

function isKimiGenerating(): boolean {
  return Boolean(findKimiStopButton())
}

async function stopKimiGenerating(): Promise<boolean> {
  const button = findKimiStopButton()
  if (!button) return false
  button.click()
  return true
}

function findKimiStopButton(): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => buttonLabelMatches(button, /stop|stopping|停止|中止/) && isClickableButton(button))
}
