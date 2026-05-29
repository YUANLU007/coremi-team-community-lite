import { parseGroupMentions, roleMentionLabel, roleMentionLabelOptionsFromSettings, roleModelLabel } from '../group/mentionParser'
import type { GroupChat, GroupMessage, GroupRole, MessageAttachment, MessageReference, OpenTeamStore } from '../group/types'
import { extractAttachmentText } from './attachmentParsers'
import type { TeamPageState } from './appState'
import { getVisibleThinkingRoles, shouldAutoReconnectRole, shouldConfirmMentionWithEnter, shouldSendMessageWithEnter } from './chatExperience'
import { runCommandWithReconnect } from './sendWithReconnect'

export interface ComposerViewDependencies {
  state: TeamPageState
  composerFormEl: HTMLFormElement
  targetPreviewEl: HTMLElement
  busyPreviewEl: HTMLElement
  sendButtonEl: HTMLButtonElement
  messageInputEl: HTMLTextAreaElement
  attachmentButtonEl: HTMLButtonElement
  attachmentInputEl: HTMLInputElement
  attachmentPreviewEl: HTMLElement
  referenceDraftEl: HTMLElement
  mentionPanelEl: HTMLElement
  getStore(): OpenTeamStore
  getCurrentChat(): GroupChat | undefined
  getCurrentRoles(): GroupRole[]
  roleToneClass(seed: string | undefined): string
  roleAvatarLabel(name: string | undefined): string
  reconnectRolesForSend(chat: GroupChat, roles: GroupRole[]): Promise<void>
  runCommand(type: string, payload?: Record<string, unknown>): Promise<void>
  showError(message: string): void
}

export interface ComposerView {
  renderComposerState(): void
  registerComposerEvents(): void
  insertMention(role: GroupRole): void
  setReference(message: GroupMessage): void
  submitComposerMessage(): Promise<void>
}

type MentionOption =
  | { type: 'all' }
  | { type: 'role'; role: GroupRole }

const MAX_ATTACHMENTS_PER_MESSAGE = 6
const MAX_INLINE_ATTACHMENT_BYTES = 4 * 1024 * 1024
const MAX_TEXT_ATTACHMENT_BYTES = 2 * 1024 * 1024
const MAX_PARSED_ATTACHMENT_BYTES = 12 * 1024 * 1024
const MAX_TEXT_PREVIEW_CHARS = 120_000

export function createComposerView(deps: ComposerViewDependencies): ComposerView {
  function mentionLabelOptions() {
    return mentionLabelOptionsFromStore(deps.getStore())
  }

  function roleDisplayName(role: GroupRole): string {
    return roleMentionLabel(role, mentionLabelOptions())
  }

  function renderComposerState(): void {
    renderReferenceDraft()
    renderAttachmentPreview()
    renderMentionPanel()

    const chat = deps.getCurrentChat()
    const roles = deps.getCurrentRoles()
    const raw = deps.messageInputEl.value.trim()
    const parsed = parseGroupMentions(raw || 'x', roles, { ...mentionLabelOptions(), defaultTarget: 'none' })
    const targetRoleIds = raw && parsed.ok ? parsed.targetRoleIds : []
    const targets = roles.filter(role => targetRoleIds.includes(role.id))
    const unavailable = targets.filter(role => role.status !== 'ready')
    const reconnecting = targets.filter(role => deps.state.reconnectingRoleKeys.has(teamRoleKey(role.chatId, role.id)))
    const thinking = getVisibleThinkingRoles(roles)

    if (!chat) {
      deps.targetPreviewEl.textContent = 'Select a chat to send'
      deps.sendButtonEl.disabled = true
    } else if (roles.length === 0) {
      deps.targetPreviewEl.textContent = 'This chat has no people yet'
      deps.sendButtonEl.disabled = true
    } else if (!raw && deps.state.pendingAttachments.length === 0) {
      deps.targetPreviewEl.textContent = 'Type a message or add attachments; without @ it is only saved, @ people to request replies'
      deps.sendButtonEl.disabled = true
    } else if (!parsed.ok) {
      deps.targetPreviewEl.textContent = parsed.error
      deps.sendButtonEl.disabled = true
    } else if (targets.length === 0) {
      deps.targetPreviewEl.textContent = 'Saved as a room note; @ people to trigger AI replies'
      deps.sendButtonEl.disabled = false
    } else if (reconnecting.length > 0) {
      const readyTargets = targets.filter(role => !reconnecting.includes(role) && role.status === 'ready')
      deps.targetPreviewEl.textContent = readyTargets.length > 0
        ? `Will send to: ${readyTargets.map(roleDisplayName).join(', ')}; reconnecting: ${reconnecting.map(roleDisplayName).join(', ')}`
        : `Auto-reconnecting: ${reconnecting.map(roleDisplayName).join(', ')}`
      deps.sendButtonEl.disabled = readyTargets.length === 0
    } else if (unavailable.length > 0) {
      const waiting = unavailable.filter(role => !shouldAutoReconnectRole(role))
      const readyTargets = targets.filter(role => role.status === 'ready')
      if (waiting.length > 0 && readyTargets.length === 0) {
        deps.targetPreviewEl.textContent = `Please wait: ${waiting.map(roleDisplayName).join(', ')} is replying`
        deps.sendButtonEl.disabled = true
      } else if (waiting.length > 0) {
        deps.targetPreviewEl.textContent = `Will send to: ${readyTargets.map(roleDisplayName).join(', ')}; skipping replying people: ${waiting.map(roleDisplayName).join(', ')}`
        deps.sendButtonEl.disabled = false
      } else {
        deps.targetPreviewEl.textContent = `Will reconnect first: ${unavailable.map(roleDisplayName).join(', ')}`
        deps.sendButtonEl.disabled = false
      }
    } else {
      deps.targetPreviewEl.textContent = `Will send to: ${targets.map(roleDisplayName).join(', ')}`
      deps.sendButtonEl.disabled = false
    }

    deps.busyPreviewEl.textContent = thinking.length > 0 ? `Replying: ${thinking.map(roleDisplayName).join(', ')}` : ''
  }

  function renderAttachmentPreview(): void {
    deps.attachmentPreviewEl.replaceChildren()
    const attachments = deps.state.pendingAttachments
    deps.attachmentPreviewEl.hidden = attachments.length === 0
    if (attachments.length === 0) return

    for (const attachment of attachments) {
      const chip = document.createElement('div')
      chip.className = 'attachment-chip'
      if (attachment.kind === 'image' && attachment.dataUrl) {
        const image = document.createElement('img')
        image.src = attachment.dataUrl
        image.alt = attachment.name
        chip.append(image)
      } else {
        const icon = document.createElement('span')
        icon.className = 'attachment-chip-icon'
        icon.textContent = attachmentKindLabel(attachment.kind)
        chip.append(icon)
      }

      const label = document.createElement('span')
      label.className = 'attachment-chip-label'
      label.textContent = `${attachment.name} · ${formatBytes(attachment.size)}`
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'attachment-chip-remove'
      remove.setAttribute('aria-label', `Remove ${attachment.name}`)
      remove.textContent = '×'
      remove.addEventListener('click', () => {
        deps.state.pendingAttachments = deps.state.pendingAttachments.filter(item => item.id !== attachment.id)
        renderComposerState()
      })
      chip.append(label, remove)
      deps.attachmentPreviewEl.append(chip)
    }
  }

  function renderReferenceDraft(): void {
    deps.referenceDraftEl.replaceChildren()
    if (!deps.state.selectedReference) {
      deps.referenceDraftEl.hidden = true
      return
    }

    deps.referenceDraftEl.hidden = false
    const preview = document.createElement('div')
    preview.className = 'reference-draft-preview'
    preview.textContent = `Quote ${deps.state.selectedReference.roleName || 'person'}: ${deps.state.selectedReference.contentSnapshot}`

    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'btn btn-ghost'
    cancel.setAttribute('aria-label', 'Cancel quote')
    cancel.textContent = '×'
    cancel.addEventListener('click', () => {
      deps.state.selectedReference = undefined
      renderComposerState()
    })
    deps.referenceDraftEl.append(preview, cancel)
  }

  function renderMentionPanel(): void {
    const roles = deps.getCurrentRoles()
    const show = shouldShowMentionPanel(deps.messageInputEl.value) && roles.length > 0
    const options = createMentionOptions(roles)
    deps.state.mentionIndex = clampMentionIndex(deps.state.mentionIndex, options)
    deps.mentionPanelEl.hidden = !show
    deps.mentionPanelEl.replaceChildren()
    if (!show) return

    options.forEach((mentionOption, index) => {
      const option = document.createElement('button')
      option.type = 'button'
      option.className = `mention-option${index === deps.state.mentionIndex ? ' active' : ''}`
      const avatar = document.createElement('span')
      const name = document.createElement('span')
      name.className = 'mention-name'
      const site = document.createElement('span')
      site.className = 'mention-site-badge'
      if (mentionOption.type === 'all') {
        avatar.className = 'mention-avatar mention-avatar-all'
        avatar.textContent = 'A'
        name.textContent = 'Everyone'
        site.textContent = 'All'
        option.addEventListener('click', () => insertAllMention())
      } else {
        const role = mentionOption.role
        avatar.className = `mention-avatar ${deps.roleToneClass(role.name)}`
        avatar.textContent = deps.roleAvatarLabel(role.name)
        name.textContent = role.name
        site.className = `mention-site-badge ${role.modelSource === 'external' ? 'site-pill-external' : `site-pill-${role.chatSite ?? 'gemini'}`}`
        site.textContent = roleModelLabel(role, mentionLabelOptions())
        option.addEventListener('click', () => insertMention(role))
      }
      option.append(avatar, name, site)
      deps.mentionPanelEl.append(option)
    })
  }

  function registerComposerEvents(): void {
    deps.attachmentButtonEl.addEventListener('click', () => deps.attachmentInputEl.click())
    deps.attachmentInputEl.addEventListener('change', () => {
      const files = Array.from(deps.attachmentInputEl.files ?? [])
      deps.attachmentInputEl.value = ''
      addAttachments(files).catch(error => deps.showError(error instanceof Error ? error.message : String(error)))
    })

    deps.composerFormEl.addEventListener('submit', event => {
      event.preventDefault()
      if (deps.sendButtonEl.disabled && deps.state.reconnectingRoleKeys.size > 0) return
      submitComposerMessage().catch(error => deps.showError(error instanceof Error ? error.message : String(error)))
    })

    deps.messageInputEl.addEventListener('input', () => {
      deps.state.mentionIndex = 0
      renderComposerState()
    })
    deps.messageInputEl.addEventListener('keyup', () => renderComposerState())
    deps.messageInputEl.addEventListener('keydown', event => {
      const roles = deps.getCurrentRoles()
      const mentionOptions = createMentionOptions(roles)
      const canHandleMention = roles.length > 0 && (shouldShowMentionPanel(deps.messageInputEl.value) || !deps.mentionPanelEl.hidden)
      if (canHandleMention) {
        deps.state.mentionIndex = clampMentionIndex(deps.state.mentionIndex, mentionOptions)
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          deps.state.mentionIndex = (deps.state.mentionIndex + 1) % mentionOptions.length
          renderMentionPanel()
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          deps.state.mentionIndex = (deps.state.mentionIndex - 1 + mentionOptions.length) % mentionOptions.length
          renderMentionPanel()
        } else if (shouldConfirmMentionWithEnter(event)) {
          event.preventDefault()
          const mentionOption = mentionOptions[deps.state.mentionIndex]
          if (mentionOption?.type === 'all') insertAllMention()
          if (mentionOption?.type === 'role') insertMention(mentionOption.role)
        } else if (event.key === 'Escape') {
          deps.mentionPanelEl.hidden = true
        }
        return
      }

      if (shouldSendMessageWithEnter(event)) {
        event.preventDefault()
        deps.composerFormEl.requestSubmit()
      }
    })
  }

  async function submitComposerMessage(): Promise<void> {
    const chat = deps.getCurrentChat()
    const raw = deps.messageInputEl.value.trim()
    const attachments = [...deps.state.pendingAttachments]
    if (!chat || (!raw && attachments.length === 0)) return
    const rawForSend = raw || '(attachment)'

    const targetResult = resolveMessageTargets(rawForSend, deps.getCurrentRoles())
    if (!targetResult.ok) {
      deps.showError(targetResult.error)
      return
    }

    const waitingRoles = targetResult.roles.filter(role => role.status === 'thinking' && !shouldAutoReconnectRole(role))
    const readyRoles = targetResult.roles.filter(role => role.status === 'ready')
    if (waitingRoles.length > 0 && readyRoles.length === 0) {
      deps.showError(`Please wait for replies to finish: ${waitingRoles.map(roleDisplayName).join(', ')}`)
      return
    }

    const reference = deps.state.selectedReference
    clearComposerAfterSend(raw, reference, attachments)
    try {
      await runCommandWithReconnect(deps, { chat, roles: targetResult.roles, type: 'GROUP_MESSAGE_SEND', payload: { chatId: chat.id, raw: rawForSend, reference, attachments } })
    } catch (error) {
      restoreComposerDraft(raw, reference, attachments)
      throw error
    }
  }

  function clearComposerAfterSend(raw: string, reference: MessageReference | undefined, attachments: MessageAttachment[]): void {
    if (deps.messageInputEl.value.trim() === raw) deps.messageInputEl.value = ''
    if (deps.state.selectedReference === reference) deps.state.selectedReference = undefined
    if (deps.state.pendingAttachments === attachments || sameAttachmentIds(deps.state.pendingAttachments, attachments)) deps.state.pendingAttachments = []
    renderComposerState()
  }

  function restoreComposerDraft(raw: string, reference: MessageReference | undefined, attachments: MessageAttachment[]): void {
    if (!deps.messageInputEl.value.trim()) deps.messageInputEl.value = raw
    if (!deps.state.selectedReference) deps.state.selectedReference = reference
    if (deps.state.pendingAttachments.length === 0) deps.state.pendingAttachments = attachments
    renderComposerState()
  }

  function setReference(message: GroupMessage): void {
    deps.state.selectedReference = {
      messageId: message.id,
      roleId: message.roleId,
      roleName: message.roleName,
      contentSnapshot: message.content,
    }
    deps.messageInputEl.focus()
    renderComposerState()
  }

  async function addAttachments(files: File[]): Promise<void> {
    if (files.length === 0) return
    const remaining = MAX_ATTACHMENTS_PER_MESSAGE - deps.state.pendingAttachments.length
    if (remaining <= 0) throw new Error(`Each message can include up to ${MAX_ATTACHMENTS_PER_MESSAGE} attachments`)
    const accepted = files.slice(0, remaining)
    const attachments = await Promise.all(accepted.map(fileToAttachment))
    deps.state.pendingAttachments = [...deps.state.pendingAttachments, ...attachments]
    if (files.length > remaining) deps.showError(`Added the first ${remaining} attachments; each message can include up to ${MAX_ATTACHMENTS_PER_MESSAGE}`)
    renderComposerState()
  }

  async function fileToAttachment(file: File): Promise<MessageAttachment> {
    const kind = attachmentKind(file)
    const dataUrl = kind === 'image' && file.size <= MAX_INLINE_ATTACHMENT_BYTES ? await readFileAsDataUrl(file) : undefined
    const canParse = kind === 'text'
      ? file.size <= MAX_TEXT_ATTACHMENT_BYTES
      : (kind === 'document' || kind === 'pdf') && file.size <= MAX_PARSED_ATTACHMENT_BYTES
    const textPreview = canParse ? (await extractAttachmentText(file, kind))?.slice(0, MAX_TEXT_PREVIEW_CHARS) : undefined
    return {
      id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      kind,
      dataUrl,
      textPreview,
      createdAt: Date.now(),
    }
  }

  function resolveMessageTargets(raw: string, roles: GroupRole[]): { ok: true; roles: GroupRole[] } | { ok: false; error: string } {
    const parsed = parseGroupMentions(raw, roles, { ...mentionLabelOptions(), defaultTarget: 'none' })
    if (!parsed.ok) return { ok: false, error: parsed.error }
    const targets = roles.filter(role => parsed.targetRoleIds.includes(role.id))
    return { ok: true, roles: targets }
  }

  function shouldShowMentionPanel(value: string): boolean {
    const cursor = deps.messageInputEl.selectionStart ?? value.length
    const beforeCursor = value.slice(0, cursor)
    const atIndex = beforeCursor.lastIndexOf('@')
    if (atIndex < 0) return false
    const mentionText = beforeCursor.slice(atIndex + 1)
    return !/\s/.test(mentionText)
  }

  function insertMention(role: GroupRole): void {
    insertMentionLabel(roleMentionLabel(role, mentionLabelOptions()))
  }

  function insertAllMention(): void {
    insertMentionLabel('Everyone')
  }

  function insertMentionLabel(label: string): void {
    const value = deps.messageInputEl.value
    const cursor = deps.messageInputEl.selectionStart ?? value.length
    const beforeCursor = value.slice(0, cursor)
    const atIndex = beforeCursor.lastIndexOf('@')
    const rawPrefix = atIndex >= 0 ? value.slice(0, atIndex) : value.slice(0, cursor)
    const prefix = rawPrefix && !/\s$/.test(rawPrefix) ? `${rawPrefix} ` : rawPrefix
    const suffix = value.slice(cursor)
    const inserted = `${prefix}@${label} ${suffix}`
    deps.messageInputEl.value = inserted
    const nextCursor = prefix.length + label.length + 2
    deps.messageInputEl.setSelectionRange(nextCursor, nextCursor)
    deps.messageInputEl.focus()
    deps.mentionPanelEl.hidden = true
    renderComposerState()
  }

  return { renderComposerState, registerComposerEvents, insertMention, setReference, submitComposerMessage }
}

function attachmentKind(file: File): MessageAttachment['kind'] {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf'
  if (isDocumentFile(file)) return 'document'
  if (file.type.startsWith('text/')) return 'text'
  if (/\.(txt|md|markdown|csv|tsv|json|html|xml|log)$/i.test(file.name)) return 'text'
  return 'file'
}

function isDocumentFile(file: File): boolean {
  if (/^(application|text)\/(msword|vnd\.openxmlformats-officedocument|vnd\.ms-|rtf)/i.test(file.type)) return true
  return /\.(doc|docx|xls|xlsx|ppt|pptx|rtf|pages|numbers|key)$/i.test(file.name)
}

function attachmentKindLabel(kind: MessageAttachment['kind']): string {
  if (kind === 'image') return 'IMG'
  if (kind === 'text') return 'TXT'
  if (kind === 'pdf') return 'PDF'
  if (kind === 'document') return 'DOC'
  if (kind === 'video') return 'VID'
  return 'FILE'
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Failed to read attachment')))
    reader.readAsDataURL(file)
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function sameAttachmentIds(left: MessageAttachment[], right: MessageAttachment[]): boolean {
  return left.length === right.length && left.every((item, index) => item.id === right[index]?.id)
}

function createMentionOptions(roles: GroupRole[]): MentionOption[] {
  return [{ type: 'all' }, ...roles.map(role => ({ type: 'role' as const, role }))]
}

function clampMentionIndex(index: number, options: MentionOption[]): number {
  if (options.length === 0) return 0
  return Math.min(Math.max(0, index), options.length - 1)
}

function mentionLabelOptionsFromStore(store: OpenTeamStore) {
  return roleMentionLabelOptionsFromSettings(store.settings)
}

function teamRoleKey(chatId: string, roleId: string): string {
  return `${chatId}:${roleId}`
}
