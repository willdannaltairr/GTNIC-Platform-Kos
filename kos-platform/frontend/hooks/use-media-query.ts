import { useEffect, useState } from 'react'

/**
 * Memantau satu media query.
 *
 * Aman untuk SSR: bernilai `false` di server dan render klien pertama, lalu
 * membaca hasil sebenarnya setelah mount dan mengikuti perubahannya (mis. saat
 * jendela diubah ukurannya atau perangkat diputar).
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = (): void => setMatches(media.matches)

    update()
    media.addEventListener('change', update)

    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}
