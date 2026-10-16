import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import type { LlmConfig } from './config.ts'
import { LlmError } from './errors.ts'

export function backgroundProcessOptions(platform: NodeJS.Platform = process.platform) {
  // Windows detached processes receive a new console even with windowsHide.
  // Ignored stdio and unref let the service outlive this launcher without a console.
  return { windowsHide: true, detached: platform !== 'win32', stdio: 'ignore' as const }
}

const execute = promisify(execFile)
interface ModelList { models: { name: string }[] }
export interface RuntimeDependencies {
  fetch: typeof fetch
  isRunning: () => Promise<boolean>
  start: () => Promise<void>
}

function localProcessDependencies(config: LlmConfig): RuntimeDependencies {
  return {
    fetch: globalThis.fetch,
    async isRunning() {
      if (process.platform !== 'win32') return false
      const result = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        "if (Get-Process -Name ollama -ErrorAction SilentlyContinue) { Write-Output 'running' }"],
        { windowsHide: true, timeout: 5_000 })
      return result.stdout.trim() === 'running'
    },
    async start() {
      try {
        await execute('ollama', ['--version'], { windowsHide: true, timeout: 5_000 })
      } catch (error) {
        console.error('[local-ai] Ollama executable check failed', error)
        throw new LlmError('NOT_INSTALLED', 'Ollama was not found on PATH. Install Ollama for Windows, then reopen the application terminal.')
      }
      await new Promise<void>((resolve, reject) => {
        const child = spawn('ollama', ['serve'], {
          ...backgroundProcessOptions(),
          env: { ...process.env, OLLAMA_HOST: new URL(config.baseUrl).host },
        })
        child.once('error', error => {
          console.error('[local-ai] Ollama startup failed', error)
          reject(new LlmError('START_FAILED', 'Local AI service could not be started. Try running ollama serve manually.'))
        })
        child.once('spawn', () => { child.unref(); resolve() })
        child.once('exit', code => {
          if (code) console.error('[local-ai] Ollama serve exited with code', code)
        })
      })
    },
  }
}

export class OllamaManager {
  private pending: Promise<void> | undefined
  message = 'Connecting to the local Qwen model...'
  private readonly dependencies: RuntimeDependencies

  constructor(private readonly config: LlmConfig, dependencies?: RuntimeDependencies) {
    this.dependencies = dependencies ?? localProcessDependencies(config)
  }

  ensureReady(): Promise<void> {
    if (!this.pending) {
      this.pending = this.initialize().finally(() => { this.pending = undefined })
    }
    return this.pending
  }

  private async probe(): Promise<ModelList | null> {
    try {
      const response = await this.dependencies.fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(this.config.probeTimeoutMs), redirect: 'error',
      })
      if (!response.ok) return null
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('models' in data) || !Array.isArray(data.models) ||
          !data.models.every(model => model && typeof model.name === 'string')) return null
      return data as ModelList
    } catch { return null }
  }

  private async initialize(): Promise<void> {
    let models = await this.probe()
    if (!models) {
      this.message = 'Local AI service is starting...'
      // A listening API is authoritative; a cold existing process should be waited for.
      if (!await this.dependencies.isRunning()) {
        // Recheck just before spawning in case another launcher started Ollama.
        models = await this.probe()
        if (!models) await this.dependencies.start()
      }
      const deadline = Date.now() + this.config.startupTimeoutMs
      while (!models && Date.now() < deadline) {
        await delay(500)
        models = await this.probe()
      }
      if (!models) throw new LlmError('START_TIMEOUT', 'Local AI service is unavailable. Ollama did not respond within 30 seconds. Check Ollama and try again.')
    }
    this.message = 'Connecting to the local Qwen model...'
    if (!models.models.some(model => model.name === this.config.model)) {
      const setup = this.config.model === 'qwen-fast:latest' ?
        'The local Qwen performance profile is missing. From the project folder, run: ollama create qwen-fast -f ./Modelfile. The base qwen2.5:3b-instruct must already be installed.' :
        `Qwen model is not installed. Please install ${this.config.model} first with: ollama pull ${this.config.model}`
      throw new LlmError('MODEL_MISSING', setup)
    }
    this.message = 'Local Qwen model is ready. Development mode: no cemetery records loaded.'
  }
}
