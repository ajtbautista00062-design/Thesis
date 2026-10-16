import type { LlmConfig } from './config.ts'
import { LlmError } from './errors.ts'
import { OllamaManager } from './ollamaManager.ts'
import type { ChatMessage } from '../src/llm/types.ts'
import { validateHistory } from './chatHistory.ts'

export interface LocalLlm {
  ensureReady(): Promise<void>
  ask(question: string, history?: ChatMessage[]): Promise<string>
  readonly message: string
}

export class OllamaClient implements LocalLlm {
  constructor(private readonly config: LlmConfig, private readonly manager: OllamaManager,
    private readonly request: typeof fetch = globalThis.fetch) {}

  get message(): string { return this.manager.message }
  ensureReady(): Promise<void> { return this.manager.ensureReady() }

  async ask(question: string, history: ChatMessage[] = []): Promise<string> {
    if (!question.trim()) throw new LlmError('EMPTY_QUESTION', 'Please enter a question first.', 400)
    if (question.length > 4_000) throw new LlmError('QUESTION_TOO_LONG', 'Please keep your question under 4,000 characters.', 400)
    let previous = validateHistory(history)
    // Retain complete recent turns that fit a conservative small-context budget.
    // Character counts approximate tokens; Ollama enforces the actual token window.
    const historyBudget = Math.max(0, this.config.contextCharacterBudget - this.config.systemPrompt.length - question.length)
    while (previous.reduce((size, message) => size + message.content.length, 0) > historyBudget) {
      previous = previous.slice(2)
    }
    await this.ensureReady()
    try {
      const response = await this.request(`${this.config.baseUrl}/api/chat`, {
        method: 'POST', redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        body: JSON.stringify({
          model: this.config.model, stream: false,
          messages: [{ role: 'system', content: this.config.systemPrompt },
            ...previous,
            { role: 'user', content: question.trim() }],
          options: this.config.generationOptions,
        }),
      })
      if (!response.ok) {
        console.error('[local-ai] Model API returned status', response.status)
        throw new LlmError('MODEL_FAILED', 'The local Qwen response failed. Check Ollama and try again.')
      }
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('message' in data) ||
          !data.message || typeof data.message !== 'object' || !('content' in data.message) ||
          typeof data.message.content !== 'string' || !data.message.content.trim()) {
        throw new LlmError('INVALID_RESPONSE', 'The local Qwen model returned an empty or invalid response. Please try again.')
      }
      return data.message.content.trim()
    } catch (error) {
      console.error('[local-ai] Question failed', error)
      if (error instanceof LlmError) throw error
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new LlmError('REQUEST_TIMEOUT', 'The local Qwen model took too long to respond. Please try again.', 504)
      }
      throw new LlmError('UNAVAILABLE', 'Local AI service is unavailable. Check Ollama and try again.')
    }
  }
}
