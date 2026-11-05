import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

// Server-safe: starts as false on the server and the first client render,
// then reads the visitor's setting after mount and follows any change to it.
export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const update = (): void => setReduced(media.matches)

    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}
