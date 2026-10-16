import type { ChatMessage } from '../src/llm/types.ts'
import { LlmError } from './errors.ts'

export function validateHistory(value: unknown): ChatMessage[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 12 || value.length % 2 !== 0) {
    throw new LlmError('INVALID_HISTORY', 'The conversation could not be read. Please start a new chat.', 400)
  }
  let length = 0
  const history = value.map((message: unknown, index): ChatMessage => {
    if (!message || typeof message !== 'object' || !('role' in message) ||
        message.role !== (index % 2 === 0 ? 'user' : 'assistant') || !('content' in message) ||
        typeof message.content !== 'string' || !message.content.trim() || message.content.length > 8_000) {
      throw new LlmError('INVALID_HISTORY', 'The conversation could not be read. Please start a new chat.', 400)
    }
    length += message.content.length
    return { role: message.role as ChatMessage['role'], content: message.content }
  })
  if (length > 24_000) throw new LlmError('HISTORY_TOO_LONG', 'This conversation is too long. Please start a new chat.', 400)
  return history
}
