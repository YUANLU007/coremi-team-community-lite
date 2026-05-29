import type { GroupChat, GroupMessage, GroupRole, RoomMode } from '../group/types'
import type { TeamPageState } from './appState'

export interface ChatHeaderViewDependencies {
  state: TeamPageState
  chatTitleEl: HTMLElement
  chatSubtitleEl: HTMLElement
  chatStatusEl: HTMLElement
  togglePeopleDrawerEl: HTMLButtonElement
  openOrchestrationEl: HTMLButtonElement
  getCurrentChat(): GroupChat | undefined
  getCurrentRoles(): GroupRole[]
  getCurrentMessages(): GroupMessage[]
}

export interface ChatHeaderView {
  renderChatHeader(): void
}

export function createChatHeaderView(deps: ChatHeaderViewDependencies): ChatHeaderView {
  function renderChatHeader(): void {
    const chat = deps.getCurrentChat()
    const roles = deps.getCurrentRoles()
    const messages = deps.getCurrentMessages()
    if (!chat) {
      deps.chatTitleEl.textContent = 'No chat selected'
      deps.chatSubtitleEl.textContent = 'Create or select a chat to start collaborating'
      deps.chatStatusEl.className = 'status-pill'
      deps.chatStatusEl.textContent = 'Idle'
      deps.togglePeopleDrawerEl.textContent = 'Members 0'
      deps.togglePeopleDrawerEl.disabled = true
      deps.openOrchestrationEl.hidden = true
      return
    }

    deps.chatTitleEl.textContent = chat.name
    deps.chatSubtitleEl.textContent = roles.length ? `${modeLabel(chat.mode)} · ${roles.length} members · ${messages.length} messages` : 'No members yet'
    deps.chatStatusEl.className = `status-pill status-${chat.status}`
    deps.chatStatusEl.textContent = chatStatusLabel(chat.status)
    deps.togglePeopleDrawerEl.disabled = false
    deps.togglePeopleDrawerEl.textContent = `Members ${roles.length}`
    deps.togglePeopleDrawerEl.setAttribute('aria-label', deps.state.peopleDrawerOpen ? 'Collapse members panel' : 'Open members panel')
    deps.togglePeopleDrawerEl.setAttribute('aria-expanded', String(deps.state.peopleDrawerOpen))
    deps.openOrchestrationEl.hidden = chat.mode !== 'collaborative'
  }

  return { renderChatHeader }
}

function modeLabel(mode: RoomMode): string {
  return mode === 'collaborative' ? 'Collaborative room' : 'Independent experts'
}

function chatStatusLabel(status: GroupChat['status']): string {
  const labels: Record<GroupChat['status'], string> = {
    draft: 'Draft',
    initializing: 'Initializing',
    ready: 'Active',
    running: 'Running',
    error: 'Error',
  }
  return labels[status]
}
