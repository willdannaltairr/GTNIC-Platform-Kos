'use client'

import type { FC, KeyboardEvent, PointerEvent, ReactNode } from 'react'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Move3d } from 'lucide-react'
import { cn } from '@/lib/utils'
import HouseScene from '@/components/landing/house-viewer/house-scene'
import {
  DEFAULT_VIEW,
  PITCH_MAX,
  PITCH_MIN,
  VIEWS,
  clamp,
  closestYaw,
  type HouseView,
  type OrbitState,
  type ViewPreset,
} from '@/components/landing/house-viewer/orbit'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

const DEFAULT_PITCH = DEFAULT_VIEW.pitch
const DRAG_YAW = 0.006
const DRAG_PITCH = 0.004

/**
 * Pengganti scene 3D saat WebGL belum siap atau tidak tersedia.
 *
 * Memakai foto hero yang sama, sehingga peralihan dari foto ke model — dan
 * sebaliknya di perangkat tanpa WebGL — tidak terasa seperti gambar yang
 * tertukar.
 */
const PhotoFallback: FC = (): ReactNode => {
  return (
    <Image
      src="/images/hero-kos-pagi.jpg"
      alt="Rumah kos berlantai satu dengan panel surya di atapnya, terlihat dari halaman depan"
      fill
      sizes="(min-width: 1024px) 60vw, 100vw"
      className="rounded-[2rem] object-cover"
    />
  )
}

/**
 * Model rumah yang bisa diputar.
 *
 * Sudut pandang disimpan di dalam ref, bukan state React: nilainya berubah
 * setiap frame saat kamera melayang sendiri, dan menyimpannya sebagai state
 * akan merender ulang seluruh pohon puluhan kali per detik. Yang masuk ke state
 * hanya sisi terdekat, karena itu yang perlu dibaca pengunjung.
 */
const HouseViewer: FC = (): ReactNode => {
  const reduced = usePrefersReducedMotion()

  const [view, setView] = useState<HouseView>(DEFAULT_VIEW.id)
  const [ready, setReady] = useState(false)
  const [touched, setTouched] = useState(false)
  const [grabbing, setGrabbing] = useState(false)

  const orbit = useRef<OrbitState>({
    yaw: DEFAULT_VIEW.yaw,
    pitch: DEFAULT_PITCH,
    intro: 0,
    lastInteraction: 0,
    dragging: false,
    reduced: false,
  })

  const drag = useRef<{ x: number; y: number } | null>(null)
  const animation = useRef<number | null>(null)

  // Scene dipasang, lalu masuk perlahan: intro singkat menjaga frame pertama
  // tidak melompat dari foto pengganti ke kamera yang sudah diam.
  useEffect(() => {
    orbit.current.reduced = reduced

    const start = performance.now()
    let frame = 0

    const step = (): void => {
      const state = orbit.current
      state.intro = Math.min(1, (performance.now() - start) / 900)

      if (state.intro < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frame)
  }, [reduced])

  // Kamera diantar ke sisi pilihan, bukan melompat, supaya arah putarannya terbaca.
  const goTo = (preset: ViewPreset): void => {
    setTouched(true)
    setView(preset.id)

    if (animation.current !== null) cancelAnimationFrame(animation.current)

    const state = orbit.current
    const fromYaw = state.yaw
    const fromPitch = state.pitch
    const toYaw = closestYaw(fromYaw, preset.yaw)
    const start = performance.now()
    const duration = reduced ? 0 : 700

    state.lastInteraction = performance.now()

    const step = (): void => {
      const progress = duration === 0 ? 1 : Math.min(1, (performance.now() - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)

      state.yaw = fromYaw + (toYaw - fromYaw) * eased
      state.pitch = fromPitch + (preset.pitch - fromPitch) * eased

      if (progress < 1) animation.current = requestAnimationFrame(step)
      else animation.current = null
    }

    animation.current = requestAnimationFrame(step)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== 'mouse') return

    drag.current = { x: event.clientX, y: event.clientY }
    orbit.current.dragging = true
    orbit.current.lastInteraction = performance.now()

    setGrabbing(true)
    setTouched(true)

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const previous = drag.current
    if (!previous) return

    const state = orbit.current

    state.yaw -= (event.clientX - previous.x) * DRAG_YAW
    state.pitch = clamp(state.pitch + (event.clientY - previous.y) * DRAG_PITCH, PITCH_MIN, PITCH_MAX)
    state.lastInteraction = performance.now()

    drag.current = { x: event.clientX, y: event.clientY }
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    drag.current = null
    orbit.current.dragging = false
    setGrabbing(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const state = orbit.current

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()

      state.yaw += event.key === 'ArrowLeft' ? -0.22 : 0.22
      state.lastInteraction = performance.now()
      setTouched(true)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()

      state.pitch = clamp(state.pitch + (event.key === 'ArrowUp' ? 0.12 : -0.12), PITCH_MIN, PITCH_MAX)
      state.lastInteraction = performance.now()
      setTouched(true)
    }
  }

  const caption = VIEWS.find((preset) => preset.id === view)?.caption ?? DEFAULT_VIEW.caption

  return (
    <div>
      <div
        role="group"
        tabIndex={0}
        aria-roledescription="tampilan 3D"
        aria-label="Model rumah kos, seret untuk memutarnya atau pakai tombol panah"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          'relative aspect-[4/3] w-full touch-pan-y select-none rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:aspect-[16/9]',
          grabbing ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <div
          aria-hidden="true"
          className={cn('absolute inset-0 transition-opacity duration-700', ready ? 'opacity-0' : 'opacity-100')}
        >
          <PhotoFallback />
        </div>

        <div className={cn('absolute inset-0 transition-opacity duration-700', ready ? 'opacity-100' : 'opacity-0')}>
          <HouseScene
            orbit={orbit}
            active={!reduced}
            onViewChange={setView}
            onReady={() => setReady(true)}
            fallback={<PhotoFallback />}
          />
        </div>

        <p
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-1/2 top-3 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-xs font-medium text-primary-strong shadow-[0_8px_24px_-12px_rgba(14,26,18,0.35)] ring-1 ring-black/5 backdrop-blur transition-opacity duration-500 sm:top-5',
            touched || !ready ? 'opacity-0' : 'opacity-100',
          )}
        >
          <Move3d className="size-4" />
          Seret untuk memutar
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div
          role="group"
          aria-label="Pilih sisi yang ingin dilihat"
          className="inline-flex rounded-full bg-mist p-1 ring-1 ring-black/5"
        >
          {VIEWS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={view === preset.id}
              onClick={() => goTo(preset)}
              className={cn(
                'h-9 rounded-full px-4 text-sm font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5',
                view === preset.id
                  ? 'bg-primary-strong text-white shadow-sm'
                  : 'text-primary-strong/70 hover:text-primary-strong',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <p
          aria-live="polite"
          className="min-h-[2.75rem] max-w-md text-balance text-center text-sm leading-relaxed text-primary-strong/75 sm:min-h-0"
        >
          {caption}
        </p>
      </div>
    </div>
  )
}

export default HouseViewer
