export function querySelectorFirst(selectors: string): HTMLElement | null {
  for (const selector of selectors.split(',').map(item => item.trim())) {
    const element = document.querySelector(selector) as HTMLElement | null
    if (element) return element
  }

  return null
}

function querySelectorAll(selectors: string): HTMLElement[] {
  return selectors
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .flatMap(selector => [...document.querySelectorAll(selector)] as HTMLElement[])
}

export function waitForElement(selectors: string, timeoutMs: number): Promise<HTMLElement> {
  const immediate = querySelectorAll(selectors).find(isVisibleElement) ?? querySelectorFirst(selectors)
  if (immediate) return Promise.resolve(immediate)

  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const element = querySelectorAll(selectors).find(isVisibleElement) ?? querySelectorFirst(selectors)
      if (element) {
        window.clearInterval(timer)
        resolve(element)
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer)
        reject(new Error(`Element not found: ${selectors}`))
      }
    }, 250)
  })
}

export function waitForClickableButton(selectors: string, timeoutMs: number, errorMessage: string): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const button = querySelectorAll(selectors).find(element => isVisibleElement(element) && isClickableButton(element))
      if (button && isClickableButton(button)) {
        window.clearInterval(timer)
        resolve(button)
        return
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer)
        reject(new Error(errorMessage))
      }
    }, 250)
  })
}

export function isClickableButton(element: HTMLElement): boolean {
  if (!(element instanceof HTMLButtonElement)) return true
  return !element.disabled && element.getAttribute('aria-disabled') !== 'true'
}

export function isVisibleElement(element: HTMLElement): boolean {
  if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return true
  return rect.width > 0 && rect.height > 0
}
