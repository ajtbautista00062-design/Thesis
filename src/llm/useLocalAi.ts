import { useEffect, useRef, useState } from 'react'
import { askLocalAi, checkLocalAi } from './client'
import type { ChatMessage } from './types'

export interface DisplayMessage extends ChatMessage { id: string }
export interface QuestionState {
  messages: DisplayMessage[]
  error: string
  busy: boolean
  retryQuestion: string
}
const empty: QuestionState = { messages: [], error: '', busy: false, retryQuestion: '' }

export function useLocalAi() {
  const [result, setResult] = useState<QuestionState>(empty)
  const [serviceMessage, setServiceMessage] = useState('Connecting to your local assistant...')
  const generation = useRef(0)
  const active = useRef(false)
  const completed = useRef<DisplayMessage[]>([])
  useEffect(() => {
    let mounted = true
    void checkLocalAi().then(status => { if (mounted) setServiceMessage(status.message) })
      .catch(error => { if (mounted) setServiceMessage(error instanceof Error ? error.message : 'Local AI service is unavailable.') })
    return () => { mounted = false }
  }, [])

  const reset = () => { generation.current++; completed.current = []; setResult({ ...empty, busy: active.current }) }
  const ask = async (question: string) => {
    if (active.current) return
    if (!question.trim()) {
      setResult(state => ({ ...state, error: 'Please enter a message first.', retryQuestion: '' }))
      return
    }
    active.current = true
    const id = ++generation.current
    const previous = completed.current
    const messages: DisplayMessage[] = [...previous, { id: crypto.randomUUID(), role: 'user', content: question.trim() }]
    setResult({ ...empty, messages, busy: true })
    // Keep only recent complete turns in the local model's context budget.
    let history = previous.slice(-12)
    while (history.reduce((length, message) => length + message.content.length, 0) > 24_000) history = history.slice(2)
    try {
      const answer = await askLocalAi(question, history.map(({ role, content }) => ({ role, content })))
      if (id === generation.current) {
        completed.current = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: answer }]
        setResult({ ...empty, messages: completed.current })
        setServiceMessage('Local Qwen model is ready. Development mode: no cemetery records loaded.')
      }
    } catch (error) {
      if (id === generation.current) setResult({ ...empty, messages, retryQuestion: question,
        error: error instanceof Error ? error.message : 'Local AI service is unavailable.' })
    } finally {
      active.current = false
      if (id !== generation.current) setResult(state => ({ ...state, busy: false }))
    }
  }
  return { result, serviceMessage, ask, reset }
}
