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
    `你是「${input.role.name}」。`,
    buildRoleBlock(input.role, input.includePersona ?? true),
    buildReferenceBlock(reference),
    `用户消息：\n${input.userMessage.content}`,
    buildAttachmentBlock(input.userMessage),
    input.responseInstruction ?? `请以「${input.role.name}」身份回复。${reference ? '请明确说明你同意或不同意哪里，以及下一步建议。' : ''}`,
  ])
}

export function buildCollaborativePrompt(input: BuildPromptInput): string {
  const reference = input.reference ?? input.userMessage.references?.[0]

  return joinSections([
    '你正在一个 AI 群聊中。',
    buildMemberList(input.roles),
    `你的身份是「${input.role.name}」。`,
    buildRoleBlock(input.role, input.includePersona ?? true),
    buildContextBlock(input),
    buildReferenceBlock(reference),
    `用户最新消息：\n${input.userMessage.content}`,
    buildAttachmentBlock(input.userMessage),
    input.responseInstruction ?? `请以「${input.role.name}」身份回复。你可以参考、补充或反驳其他成员观点。${reference ? '请明确回应用户引用的观点。' : ''}`,
  ])
}

export function buildInitializationPrompt(chat: GroupChat, role: GroupRole, roles: GroupRole[], includePersona = true): string {
  if (chat.mode === 'collaborative') {
    return joinSections([
      '你正在一个 AI 群聊中。',
      buildMemberList(roles),
      `你的身份是「${role.name}」。`,
      buildRoleBlock(role, includePersona),
      '请保持你的人员视角。你可以回应、补充或反驳其他成员的观点。当用户引用某位成员的发言时，请明确回应那条观点。',
    ])
  }

  return joinSections([
    `你是「${role.name}」。`,
    buildRoleBlock(role, includePersona),
    '用户会给你任务。请始终保持你的人员视角，独立回答，不需要假设还有其他 AI 成员。',
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
  const members = roles.map(role => `- ${role.name}${role.description ? `：${role.description}` : ''}`).join('\n')
  return `群聊成员：\n${members}`
}

function buildRoleBlock(role: GroupRole, includePersona: boolean): string {
  return joinSections([
    role.description ? `你的职责：\n${role.description}` : undefined,
    includePersona && role.systemPrompt ? `人设：\n${role.systemPrompt}` : undefined,
  ])
}

function buildContextBlock(input: BuildPromptInput): string {
  if (input.unsyncedContext) {
    return joinSections([
      input.unsyncedContext.omittedEarlyContext ? '部分早期上下文已省略。' : undefined,
      input.unsyncedContext.contextText
        ? `你上次之后，群聊里有这些新内容：\n${input.unsyncedContext.contextText}`
        : '你上次之后，群聊里没有需要同步的新内容。',
    ])
  }

  const messages = input.unsyncedMessages ?? []
  if (messages.length === 0) return ''

  const maxContextChars = input.maxContextChars ?? 6000
  const context = messages.map(formatContextMessage).join('\n\n')
  if (context.length <= maxContextChars) {
    return `你上次之后，群聊里有这些新内容：\n${context}`
  }

  return `[部分早期上下文已省略]\n\n你上次之后，群聊里有这些新内容：\n${context.slice(-maxContextChars).trimStart()}`
}

function buildReferenceBlock(reference: MessageReference | undefined): string {
  if (!reference) return ''
  const source = reference.roleName ? `「${reference.roleName}」的观点` : '一条消息'
  return `用户引用了${source}：\n「${reference.contentSnapshot}」\n请明确回应这条引用。`
}

function buildAttachmentBlock(message: GroupMessage): string {
  const attachments = message.attachments ?? []
  if (attachments.length === 0) return ''
  const sections = attachments.map(attachment => {
    const header = `附件：${attachment.name}（${attachment.kind}，${formatBytes(attachment.size)}）`
    if (attachment.textPreview?.trim()) {
      return `${header}\n${attachment.textPreview.trim()}`
    }
    if (attachment.kind === 'image') {
      return `${header}\n用户附加了一张图片。当前网页投递模式不能直接上传图片二进制内容；请根据用户文字和图片文件名提出观察问题、分析框架或需要用户补充的信息。`
    }
    if (attachment.kind === 'pdf' || attachment.kind === 'document' || attachment.kind === 'video') {
      return `${header}\n用户附加了一个${attachmentKindName(attachment.kind)}，但没有抽取到可读文本。请根据用户文字和文件名推进分析，并提示用户粘贴关键段落、换成可复制文本的文件，或确认该文件不是扫描件/图片型文件。`
    }
    return `${header}\n当前只附加了文件元信息；如需分析文件内容，请提示用户改用文本文件或粘贴关键内容。`
  })
  return `用户附加了这些材料：\n\n${sections.join('\n\n')}`
}

function attachmentKindName(kind: NonNullable<GroupMessage['attachments']>[number]['kind']): string {
  if (kind === 'pdf') return 'PDF 文件'
  if (kind === 'document') return '文档文件'
  if (kind === 'video') return '视频文件'
  return '文件'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function joinSections(sections: Array<string | undefined>): string {
  return sections.filter((section): section is string => Boolean(section?.trim())).join('\n\n')
}
