import { describe, expect, it } from 'vitest'
import { buildPrompt } from './promptBuilder'
import type { GroupChat, GroupMessage, GroupRole } from './types'

const chat: GroupChat = {
  id: 'chat-1',
  name: '新闻',
  mode: 'collaborative',
  roleIds: ['role-1'],
  messageIds: ['msg-1'],
  nextMessageSeq: 2,
  status: 'ready',
  createdAt: 1,
  updatedAt: 1,
}

const role: GroupRole = {
  id: 'role-1',
  chatId: 'chat-1',
  name: '硅谷远眺coremi',
  description: '新闻研究员',
  systemPrompt: '关注 AI 和资本市场。',
  status: 'ready',
  contextCursor: 0,
  createdAt: 1,
  updatedAt: 1,
}

function userMessage(content: string): GroupMessage {
  return {
    id: 'msg-1',
    chatId: 'chat-1',
    seq: 1,
    type: 'user',
    content,
    targetRoleIds: ['role-1'],
    createdAt: 2,
    status: 'pending',
  }
}

describe('promptBuilder', () => {
  it('puts the current user message before chat history in collaborative prompts', () => {
    const prompt = buildPrompt({
      chat,
      role,
      roles: [role],
      userMessage: userMessage('英伟达最大的敌人是谁？'),
      unsyncedMessages: [
        {
          id: 'old-msg',
          chatId: 'chat-1',
          seq: 0,
          type: 'user',
          content: '继续 Robot 2030 的会议产品方案。',
          createdAt: 1,
          status: 'received',
        },
      ],
    })

    expect(prompt.indexOf('【本轮用户消息｜最高优先级】')).toBeLessThan(prompt.indexOf('群聊历史参考'))
    expect(prompt).toContain('英伟达最大的敌人是谁？')
    expect(prompt).toContain('不得把旧任务、旧项目、旧网页会话或其他成员早先内容当成当前问题')
  })

  it('treats an unqualified new question as a new topic', () => {
    const prompt = buildPrompt({
      chat,
      role,
      roles: [role],
      userMessage: userMessage('投资黄金，现在的时机合适吗？'),
    })

    expect(prompt).toContain('用户没有明确说“继续/刚才/上面/它/这个”时，默认这是一个新问题')
    expect(prompt).toContain('什么条件下可以买 / 什么条件下应等待 / 什么条件下应卖出或减仓')
  })
})
