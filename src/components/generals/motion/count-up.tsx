import type { FC, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, useInView } from 'framer-motion'

export interface CountUpProps {
  /** The final value to animate to (e.g., "$1,234.56" or "99.9%") */
  value: string
  /** Optional custom duration in seconds. Defaults to 1.8 */
  duration?: number
  /** Standard React HTML className for styling */
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
 * Parses a string to extract formatting, prefix, suffix, and the raw number.
 * Matches: (any non-digit prefix)(the number with commas/decimals)(any trailing suffix)
 */
const parseValue = (val: string): ParsedValue | null => {
  const match = val.match(/^([^0-9.-]*)([0-9,.-]+)(.*)$/)
  if (!match) return null

  const raw = match[2].replace(/,/g, '')
  const parsedNumber = Number.parseFloat(raw)
  if (Number.isNaN(parsedNumber)) return null

  return {
    prefix: match[1] || '',
    number: parsedNumber,
    suffix: match[3] || '',
    decimals: raw.includes('.') ? raw.split('.')[1].length : 0,
    grouped: match[2].includes(','),
  }
}

/**
 * Counts a figure up from zero the first time it scrolls into view.
 * The server renders the final value, ensuring SEO and non-JS fallback safety.
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
      ? Number(fixed).toLocaleString('en-US', {
          minimumFractionDigits: parsed.decimals,
          maximumFractionDigits: parsed.decimals,
        })
      : fixed

    return `${parsed.prefix}${shown}${parsed.suffix}`
  }

  useEffect(() => {
    if (!parsed || started.current) return

    // Accessibility check: Skip animation if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      started.current = true
      return
    }

    // Set initial display to 0 if it's on screen but not yet fully intersecting
    // according to your margins, keeping it zeroed until the animation fires.
    if (!inView) {
      setDisplay(format(0))
      return
    }

    started.current = true

    const controls = animate(0, parsed.number, {
      duration,
      ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier (out-quint)
      onUpdate: (latest) => setDisplay(format(latest)),
    })

    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, parsed, duration])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}

export default CountUp
