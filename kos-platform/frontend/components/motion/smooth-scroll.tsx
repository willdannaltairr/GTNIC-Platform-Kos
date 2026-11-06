'use client'

import type { FC, ReactNode } from 'react'

import Lenis from 'lenis'
import { useEffect } from 'react'

const HEADER_OFFSET = -88

/**
 * Penggulungan halus untuk landing page.
 *
 * Tautan ke bagian dalam halaman yang sama akan meluncur ke targetnya;
 * pengunjung yang memilih reduced motion tetap memakai penggulungan bawaan
 * browser (kelas `html.lenis` juga melepas `scroll-behavior: smooth` supaya
 * keduanya tidak saling menimpa).
 */
const SmoothScroll: FC = (): ReactNode => {
  useEffect(() => {
    // Pengunjung yang meminta gerakan minimal tidak mendapat Lenis sama sekali:
    // penggulungan beranimasi itu sendiri adalah gerakan, dan hanya meluncurkan
    // ulang tautan ke bagian halaman tidak cukup untuk menghormatinya.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 0.95,
    })

    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const element = event.target instanceof Element ? event.target : null
      const anchor = element?.closest('a[href]') as HTMLAnchorElement | null

      if (!anchor || anchor.target === '_blank') return

      const url = new URL(anchor.href, window.location.href)

      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return

      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)))
      if (!target) return

      event.preventDefault()
      lenis.scrollTo(target, { offset: HEADER_OFFSET, duration: 1.4 })
      window.history.replaceState(window.history.state, '', url.hash)
    }

    window.addEventListener('click', onClick, true)

    return () => {
      window.removeEventListener('click', onClick, true)
      lenis.destroy()
    }
  }, [])

  return null
}

export default SmoothScroll
