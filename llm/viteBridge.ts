import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { LocalLlm } from './llmClient.ts'
import { LlmError, publicError } from './errors.ts'
import { validateHistory } from './chatHistory.ts'
import type { ChatMessage } from '../src/llm/types.ts'

function send(res: ServerResponse, status: number, data: object): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(data))
}

async function readQuestion(req: IncomingMessage): Promise<{ question: string; history: ChatMessage[] }> {
  if (!req.headers['content-type']?.startsWith('application/json')) {
    throw new LlmError('INVALID_REQUEST', 'Please submit a question in the application.', 400)
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 140_000) throw new LlmError('QUESTION_TOO_LONG', 'This conversation is too long. Please start a new chat.', 413)
    chunks.push(buffer)
  }
  let body: unknown
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new LlmError('INVALID_REQUEST', 'The question could not be read. Please try again.', 400) }
  if (!body || typeof body !== 'object' || !('question' in body) || typeof body.question !== 'string') {
    throw new LlmError('INVALID_REQUEST', 'Please enter a question first.', 400)
  }
  return { question: body.question, history: validateHistory('history' in body ? body.history : undefined) }
}

export function localLlmBridge(client: LocalLlm): Plugin {
  let busy = false
  const install = (server: { middlewares: { use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) => {
    void client.ensureReady().catch(error => console.error('[local-ai] Startup check:', publicError(error).message, error))
    server.middlewares.use((req, res, next) => {
      const route = req.url?.split('?')[0]
      if (route !== '/api/llm/status' && route !== '/api/llm/ask') return next()
      void (async () => {
        // Loopback binding + exact same-origin requests guard this local process bridge.
        const host = req.headers.host || ''
        if (!/^127\.0\.0\.1:\d+$/.test(host) ||
            (req.headers.origin && req.headers.origin !== `http://${host}`) ||
            req.headers['sec-fetch-site'] === 'cross-site') {
          throw new LlmError('FORBIDDEN', 'Open the application using its local 127.0.0.1 address.', 403)
        }
        if (route === '/api/llm/status' && req.method === 'GET') {
          await client.ensureReady()
          send(res, 200, { ready: true, message: client.message })
        } else if (route === '/api/llm/ask' && req.method === 'POST') {
          const { question, history } = await readQuestion(req)
          if (busy) throw new LlmError('BUSY', 'The local model is answering another question. Please wait and try again.', 429)
          busy = true
          try { send(res, 200, { answer: await client.ask(question, history) }) }
          finally { busy = false }
        } else send(res, 405, { message: 'This request method is not supported.' })
      })().catch(error => {
        console.error('[local-ai] Bridge request failed', error)
        const safe = publicError(error)
        if (!res.headersSent) send(res, safe.status, { code: safe.code, message: safe.message, ready: false })
      })
    })
  }
  return { name: 'local-llm-bridge', configureServer: install, configurePreviewServer: install }
}
