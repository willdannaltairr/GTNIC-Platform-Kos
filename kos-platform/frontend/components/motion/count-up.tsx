'use client'

import type { FC, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, useInView } from 'motion/react'

export interface CountUpProps {
  /** Nilai akhir yang dianimasikan, mis. "96,4%" atau "12 bulan". */
  value: string
  /** Durasi animasi dalam detik. Bawaan 1.8. */
  duration?: number
  className?: string
}

interface ParsedValue {
  prefix: string
  number: number
  suffix: string
  decimals: number
  grouped: boolean
}

/**
 * Memisahkan awalan, angka, dan akhiran dari sebuah string agar hanya bagian
 * angkanya yang dianimasikan — "96,4%" tetap menjadi "96,4%" di akhir.
 */
const parseValue = (val: string): ParsedValue | null => {
  const match = val.match(/^([^0-9.-]*)([0-9.,-]+)(.*)$/)
  if (!match) return null

  const raw = match[2].replace(/\./g, '').replace(',', '.')
  const parsedNumber = Number.parseFloat(raw)
  if (Number.isNaN(parsedNumber)) return null

  return {
    prefix: match[1] || '',
    number: parsedNumber,
    suffix: match[3] || '',
    decimals: raw.includes('.') ? raw.split('.')[1].length : 0,
    grouped: match[2].includes('.') || match[2].includes(','),
  }
}

/**
 * Menghitung angka naik dari nol saat pertama kali masuk layar.
 *
 * Server merender nilai akhirnya, jadi tanpa JavaScript (dan untuk mesin
 * pencari) angka yang benar tetap terlihat — bukan nol.
 */
const CountUp: FC<CountUpProps> = ({ value, className, duration = 1.8 }): ReactNode => {
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  const parsed = useMemo(() => parseValue(value), [value])
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })

  const [display, setDisplay] = useState(value)

  const format = (current: number): string => {
    if (!parsed) return value

    const fixed = current.toFixed(parsed.decimals)
    const shown = parsed.grouped
      ? Number(fixed).toLocaleString('id-ID', {
          minimumFractionDigits: parsed.decimals,
          maximumFractionDigits: parsed.decimals,
        })
      : fixed

    return `${parsed.prefix}${shown}${parsed.suffix}`
  }

  useEffect(() => {
    if (!parsed || started.current) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      started.current = true
      return
    }

    if (!inView) {
      setDisplay(format(0))
      return
    }

    started.current = true

    const controls = animate(0, parsed.number, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(format(latest)),
    })

    return () => controls.stop()
    // `format` diturunkan dari `parsed` dan `value`; keduanya sudah ada di daftar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, parsed, duration])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}

export default CountUp
