import type { GroupChat, GroupMessage, GroupRole, OpenTeamStore, RoomMode } from '../group/types'

export function formatChatExportMarkdown(store: OpenTeamStore, chat: GroupChat, exportedAt = new Date()): string {
  const roles = chat.roleIds
    .map(roleId => store.rolesById[roleId])
    .filter((role): role is GroupRole => Boolean(role))
  const messages = chat.messageIds
    .map(messageId => store.messagesById[messageId])
    .filter((message): message is GroupMessage => Boolean(message))
    .sort((left, right) => left.seq - right.seq || left.createdAt - right.createdAt)

  const lines = [
    `# ${chat.name}`,
    '',
    `- Exported at: ${formatExportDateTime(exportedAt)}`,
    `- Room mode: ${modeLabel(chat.mode)}`,
    `- Current members: ${roles.map(role => role.name).join(', ') || 'none'}`,
    `- Message count: ${messages.length}`,
    '',
    '## Chat Record',
    '',
  ]

  for (const message of messages) {
    lines.push(`### ${messageSenderLabel(store, message)}`)
    lines.push('')
    lines.push(`> ${formatExportDateTime(new Date(message.createdAt))}`)
    lines.push('')
    lines.push(message.content || '(empty message)')
    if (message.attachments?.length) {
      lines.push('')
      lines.push('Attachments:')
      for (const attachment of message.attachments) {
        lines.push(`- ${attachment.name} (${attachment.mimeType || attachment.kind}, ${formatBytes(attachment.size)})`)
        if (attachment.textPreview?.trim()) {
          lines.push('')
          lines.push('```')
          lines.push(attachment.textPreview.trim())
          lines.push('```')
        }
      }
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}

export function safeChatExportFilename(chatName: string, exportedAt = new Date()): string {
  const safeName = chatName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'group-chat'
  return `openteam-${safeName}-${formatFilenameDateTime(exportedAt)}.md`
}

function messageSenderLabel(store: OpenTeamStore, message: GroupMessage): string {
  if (message.type === 'user') return 'Me'
  if (message.type === 'system') return 'System'
  if (message.roleName) return message.roleName
  if (message.roleId) return store.rolesById[message.roleId]?.name ?? 'AI person'
  return 'AI person'
}

function modeLabel(mode: RoomMode): string {
  return mode === 'collaborative' ? 'Collaborative room' : 'Independent experts'
}

function formatExportDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  const second = pad(date.getSeconds())
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function formatFilenameDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  const second = pad(date.getSeconds())
  return `${year}${month}${day}-${hour}${minute}${second}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
