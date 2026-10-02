import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthContext } from './authContext'
import { apiRequest, ApiError } from '@/services/api'
import { clearToken, readToken, saveToken } from '@/services/session'

export default function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null, error: '' })
  const revision = useRef(0)

  const logout = useCallback(() => {
    revision.current++
    clearToken()
    setSession({ status: 'anonymous', user: null, error: '' })
  }, [])

  const restoreSession = useCallback(async (signal) => {
    const current = ++revision.current
    // Keep effect updates asynchronous, including the no-token branch.
    await Promise.resolve()
    if (signal?.aborted || current !== revision.current) return
    setSession({ status: 'loading', user: null, error: '' })
    try {
      const token = readToken()
      if (!token) {
        if (current === revision.current) setSession({ status: 'anonymous', user: null, error: '' })
        return
      }
      const data = await apiRequest('/auth/me', { token, signal })
      if (current === revision.current) setSession({ status: 'authenticated', user: data.user, error: '' })
    } catch (error) {
      if (signal?.aborted || current !== revision.current) return
      if (error.status === 401) logout()
      else setSession({ status: 'error', user: null, error: 'We could not verify your session. Please try again.' })
    }
  }, [logout])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => restoreSession(controller.signal))
    window.addEventListener('auth:unauthorized', logout)
    return () => {
      controller.abort()
      window.removeEventListener('auth:unauthorized', logout)
    }
  }, [restoreSession, logout])

  const login = async (email, password) => {
    const current = ++revision.current
    const result = await apiRequest('/auth/login', { method: 'POST', body: { email, password }, token: null })
    const profile = await apiRequest('/auth/me', { token: result.token })
    if (current !== revision.current) throw new ApiError('Sign in was cancelled. Please try again.')
    saveToken(result.token)
    setSession({ status: 'authenticated', user: profile.user, error: '' })
  }

  return <AuthContext.Provider value={{ ...session, login, logout, retry: restoreSession }}>{children}</AuthContext.Provider>
}
