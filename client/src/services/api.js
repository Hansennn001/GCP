import { readToken } from './session'

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

// Relative URLs use Vite's development proxy and the eventual same-origin deployment.
export async function apiRequest(path, { method = 'GET', body, token = readToken(), signal } = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  const timeout = setTimeout(abort, 30000)
  try {
    const response = await fetch(`/api${path}`, {
      method, signal: controller.signal,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const data = response.status === 204 ? null : await response.json()
    if (!response.ok) {
      if (response.status === 401 && token && token === readToken()) {
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
      throw new ApiError(response.status === 401 ? 'Your session has expired. Please sign in again.' : 'The request could not be completed. Please try again.', response.status)
    }
    return data
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error
    throw new ApiError('Unable to connect. Please try again.')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
