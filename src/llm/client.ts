import type { ChatMessage } from './types'
export interface LlmStatus { ready: boolean; message: string }
interface AnswerResponse { answer: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`/api/llm/${path}`, {
      ...init, signal: AbortSignal.timeout(165_000),
    })
    const data = await response.json() as T & { message?: string }
    if (!response.ok) throw new Error(data.message || 'Local AI service is unavailable.')
    return data
  } catch (error) {
    console.error('[local-ai] UI request failed', error)
    if (error instanceof Error && error.name === 'Error') throw error
    throw new Error('Local AI service is unavailable or timed out. Check the application terminal and try again.')
  }
}

export function checkLocalAi(): Promise<LlmStatus> { return request<LlmStatus>('status') }
export async function askLocalAi(question: string, history: ChatMessage[] = []): Promise<string> {
  const response = await request<AnswerResponse>('ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
  })
  if (typeof response.answer !== 'string') throw new Error('The local model returned an invalid response.')
  return response.answer
}
