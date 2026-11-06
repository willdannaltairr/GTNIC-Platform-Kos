import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Aman untuk SSR: mulai dari `false` di server dan render klien pertama, lalu
 * membaca pengaturan pengunjung setelah mount dan mengikuti perubahannya.
 *
 * Nilai awal `false` disengaja — animasi tetap dirender, hanya digerakkan oleh
 * JS setelah hidrasi, sehingga markup server dan klien identik.
 */
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
