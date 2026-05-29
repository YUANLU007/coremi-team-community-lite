import { formatContextMessage, type UnsyncedContextResult } from './contextSync'
import type { GroupChat, GroupMessage, GroupRole, MessageReference } from './types'

export interface BuildPromptInput {
  chat: GroupChat
  role: GroupRole
  userMessage: GroupMessage
  roles: GroupRole[]
  unsyncedContext?: UnsyncedContextResult
  unsyncedMessages?: GroupMessage[]
  maxContextChars?: number
  reference?: MessageReference
  includePersona?: boolean
  responseInstruction?: string
}

export function buildPrompt(input: BuildPromptInput): string {
  return input.chat.mode === 'collaborative'
    ? buildCollaborativePrompt(input)
    : buildIndependentPrompt(input)
}

export function buildIndependentPrompt(input: BuildPromptInput): string {
  const reference = input.reference ?? input.userMessage.references?.[0]
  return joinSections([
    `You are "${input.role.name}".`,
    buildRoleBlock(input.role, input.includePersona ?? true),
    buildReferenceBlock(reference),
    `User message:\n${input.userMessage.content}`,
    buildAttachmentBlock(input.userMessage),
    input.responseInstruction ?? `Reply as "${input.role.name}". ${reference ? 'Clearly explain where you agree or disagree, and suggest the next step.' : ''}`,
  ])
}

export function buildCollaborativePrompt(input: BuildPromptInput): string {
  const reference = input.reference ?? input.userMessage.references?.[0]

  return joinSections([
    'You are in a multi-agent AI team chat.',
    buildMemberList(input.roles),
    `Your role is "${input.role.name}".`,
    buildRoleBlock(input.role, input.includePersona ?? true),
    buildContextBlock(input),
    buildReferenceBlock(reference),
    `Latest user message:\n${input.userMessage.content}`,
    buildAttachmentBlock(input.userMessage),
    input.responseInstruction ?? `Reply as "${input.role.name}". You may reference, extend, or challenge other members' views. ${reference ? 'Respond directly to the referenced message.' : ''}`,
  ])
}

export function buildInitializationPrompt(chat: GroupChat, role: GroupRole, roles: GroupRole[], includePersona = true): string {
  if (chat.mode === 'collaborative') {
    return joinSections([
      'You are in a multi-agent AI team chat.',
      buildMemberList(roles),
      `Your role is "${role.name}".`,
      buildRoleBlock(role, includePersona),
      'Stay in your assigned role. You may respond to, extend, or challenge other members. When the user quotes a member, respond directly to that view.',
    ])
  }

  return joinSections([
    `You are "${role.name}".`,
    buildRoleBlock(role, includePersona),
    'The user will give you tasks. Stay in your assigned role and answer independently; do not assume there are other AI members unless context says so.',
  ])
}

export function buildInitPrompt(chat: GroupChat, role: GroupRole, roles: GroupRole[], includePersona = true): string {
  return buildInitializationPrompt(chat, role, roles, includePersona)
}

export function buildReinitializationPrompt(chat: GroupChat, role: GroupRole, roles: GroupRole[], includePersona = true): string {
  return buildInitializationPrompt(chat, role, roles, includePersona)
}

export function buildReinitPrompt(chat: GroupChat, role: GroupRole, roles: GroupRole[], includePersona = true): string {
  return buildReinitializationPrompt(chat, role, roles, includePersona)
}

export function roleUsesChatGptGptsPersona(role: GroupRole): boolean {
  return role.chatSite === 'chatgpt' && Boolean(role.chatGptGptsUrl?.trim())
}

export function buildMemberList(roles: GroupRole[]): string {
  const members = roles.map(role => `- ${role.name}${role.description ? `: ${role.description}` : ''}`).join('\n')
  return `Team members:\n${members}`
}

function buildRoleBlock(role: GroupRole, includePersona: boolean): string {
  return joinSections([
    role.description ? `Your responsibility:\n${role.description}` : undefined,
    includePersona && role.systemPrompt ? `Persona:\n${role.systemPrompt}` : undefined,
  ])
}

function buildContextBlock(input: BuildPromptInput): string {
  if (input.unsyncedContext) {
    return joinSections([
      input.unsyncedContext.omittedEarlyContext ? 'Some earlier context has been omitted.' : undefined,
      input.unsyncedContext.contextText
        ? `New team-chat context since your last turn:\n${input.unsyncedContext.contextText}`
        : 'There is no new context to sync since your last turn.',
    ])
  }

  const messages = input.unsyncedMessages ?? []
  if (messages.length === 0) return ''

  const maxContextChars = input.maxContextChars ?? 6000
  const context = messages.map(formatContextMessage).join('\n\n')
  if (context.length <= maxContextChars) {
    return `New team-chat context since your last turn:\n${context}`
  }

  return `[Some earlier context has been omitted]\n\nNew team-chat context since your last turn:\n${context.slice(-maxContextChars).trimStart()}`
}

function buildReferenceBlock(reference: MessageReference | undefined): string {
  if (!reference) return ''
  const source = reference.roleName ? `${reference.roleName}'s view` : 'a message'
  return `The user referenced ${source}:\n"${reference.contentSnapshot}"\nRespond directly to this reference.`
}

function buildAttachmentBlock(message: GroupMessage): string {
  const attachments = message.attachments ?? []
  if (attachments.length === 0) return ''
  const sections = attachments.map(attachment => {
    const header = `Attachment: ${attachment.name} (${attachment.kind}, ${formatBytes(attachment.size)})`
    if (attachment.textPreview?.trim()) {
      return `${header}\n${attachment.textPreview.trim()}`
    }
    if (attachment.kind === 'image') {
      return `${header}\nThe user attached an image. This browser delivery mode cannot upload image binaries directly; use the user's text and file name to ask observation questions, propose an analysis frame, or request missing details.`
    }
    if (attachment.kind === 'pdf' || attachment.kind === 'document' || attachment.kind === 'video') {
      return `${header}\nThe user attached a ${attachmentKindName(attachment.kind)}, but no readable text was extracted. Continue from the user's text and file name, and ask them to paste key passages, upload a copyable text file, or confirm the file is not scan/image-only.`
    }
    return `${header}\nOnly file metadata is attached. If file content analysis is needed, ask the user to provide a text file or paste the key content.`
  })
  return `The user attached these materials:\n\n${sections.join('\n\n')}`
}

function attachmentKindName(kind: NonNullable<GroupMessage['attachments']>[number]['kind']): string {
  if (kind === 'pdf') return 'PDF file'
  if (kind === 'document') return 'document file'
  if (kind === 'video') return 'video file'
  return 'file'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function joinSections(sections: Array<string | undefined>): string {
  return sections.filter((section): section is string => Boolean(section?.trim())).join('\n\n')
}
