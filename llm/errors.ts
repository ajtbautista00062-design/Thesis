export class LlmError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 503) {
    super(message)
    this.name = 'LlmError'
  }
}

export function publicError(error: unknown): LlmError {
  if (error instanceof LlmError) return error
  return new LlmError('UNAVAILABLE', 'Local AI service is unavailable. Please try again.')
}
