import { useEffect, useRef } from 'react'
import type { QuestionState } from './useLocalAi'
import './chat.css'

interface AskChatProps {
  query: string
  result: QuestionState
  serviceMessage: string
  setQuery: (question: string) => void
  runQuery: (question?: string) => void
  newChat: () => void
  cemetery: { id: string; name: string }
}
const suggestions = [
  ['Land information', 'What is a Cemetery Land Information System?'],
  ['Mapping & surveying', 'How does GIS help manage cemetery land?'],
  ['Records & planning', 'What information should a burial plot record contain?'],
]

export default function AskChat({ query, result, serviceMessage, setQuery, runQuery, newChat, cemetery }: AskChatProps) {
  const thread = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (thread.current) thread.current.scrollTop = result.messages.length ? thread.current.scrollHeight : 0
    if (!result.busy && result.messages.length) composer.current?.focus({ preventScroll: true })
  }, [result.messages.length, result.busy, result.error])

  return <section className="cemetery-chat" aria-label="Ask Cemetery chat">
    <header className="chat-heading"><div><p className="eyebrow">YOUR LOCAL AI COMPANION</p><h2>Ask Cemetery</h2><p>Explore cemetery land information, one conversation at a time.</p></div><span className="chat-local-badge"><i className="online-dot"/> LOCAL AI</span></header>
    <div className="chat-surface">
      <div className="chat-thread" ref={thread} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" aria-busy={result.busy}>
        {!result.messages.length && <div className="chat-welcome">
          <div className="chat-symbol" aria-hidden="true">✦</div><p className="eyebrow">CEMETERY GEOAI ASSISTANT</p>
          <h3>What would you like to explore?</h3><p>Ask about cemetery land management, surveying, GIS, burial plots, or information systems. You can ask follow-up questions, too.</p>
          <div className="chat-suggestions">{suggestions.map(([label, question]) => <button key={label} disabled={result.busy} onClick={() => runQuery(question)}><span>{label}</span><b>{question}</b><em aria-hidden="true">↗</em></button>)}</div>
          <small role="status">{serviceMessage}</small>
        </div>}
        {result.messages.map(message => <div key={message.id} className={`chat-message chat-message-${message.role}`}>
          <div className="chat-message-avatar" aria-hidden="true">{message.role === 'assistant' ? '✦' : 'You'}</div>
          <div className="chat-message-body"><span className="chat-message-name">{message.role === 'assistant' ? 'Cemetery GeoAI' : 'You'}</span><div className="chat-bubble">{message.content}</div></div>
        </div>)}
        {result.busy && <div className="chat-message chat-message-assistant"><div className="chat-message-avatar" aria-hidden="true">✦</div><div className="chat-message-body"><span className="chat-message-name">Cemetery GeoAI</span><div className="chat-thinking" role="status"><span aria-hidden="true">● ● ●</span> Thinking locally...</div></div></div>}
        {result.error && <div className="chat-error" role="alert">{result.error}{result.retryQuestion && <button disabled={result.busy} onClick={() => runQuery(result.retryQuestion)}>Try again</button>}</div>}
      </div>
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); runQuery() }}>
        <textarea ref={composer} aria-label="Message Cemetery GeoAI" value={query} onChange={event => setQuery(event.target.value)} rows={2} maxLength={4000} placeholder="Ask anything about cemetery land information..." disabled={result.busy} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); runQuery() }
        }}/>
        <div className="chat-composer-bottom"><span>Enter to send <i>·</i> Shift + Enter for a new line</span><button type="submit" disabled={result.busy || !query.trim()} aria-label="Send message">{result.busy ? 'Thinking...' : 'Send message'} <span aria-hidden="true">↑</span></button></div>
      </form>
    </div>
    <footer className="chat-note"><button className="chat-reset" onClick={newChat} disabled={result.busy}>Start a new chat</button><br/>Chats stay in this session. General guidance only; verified records for {cemetery.name} are not connected yet.</footer>
  </section>
}
