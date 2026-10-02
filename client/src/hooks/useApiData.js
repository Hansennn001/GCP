import { useEffect, useReducer, useState } from 'react'

export function useApiData(loader) {
  const [version, reload] = useReducer(value => value + 1, 0)
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return
      setState({ data: null, loading: true, error: '' })
      try {
        const data = await loader(controller.signal)
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' })
      } catch (error) {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error: error.status === 403
          ? 'Your account does not have access to this data.' : 'Could not load data. Please try again.' })
      }
    })
    return () => controller.abort()
  }, [loader, version])
  return { ...state, reload }
}
