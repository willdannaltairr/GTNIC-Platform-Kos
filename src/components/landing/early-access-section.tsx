import type { FC, FormEvent, ReactNode } from 'react'

import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { buttonClasses } from '@/components/generals/button'
import Magnetic from '@/components/generals/motion/magnetic'
import SolarArrayViewer from '@/components/landing/solar-array/solar-array-viewer'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const EMAIL_PATTERN = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/

const EarlyAccessSection: FC = (): ReactNode => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const honeypotRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const still = usePrefersReducedMotion()

  const { scrollYProgress } = useScroll({ target: imageRef, offset: ['start end', 'end end'] })
  const imageScale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  const imageY = useTransform(scrollYProgress, [0, 1], [70, 0])

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const value = email.trim()

    if (!EMAIL_PATTERN.test(value)) {
      setStatus('error')
      setMessage('Please enter a valid work email.')

      return
    }

    setStatus('submitting')
    setMessage('')

    try {
      const response = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, website: honeypotRef.current?.value ?? '' }),
      })

      const result = (await response.json().catch(() => ({}))) as { message?: string }

      if (!response.ok) {
        setStatus('error')
        setMessage(result.message || 'Something went wrong on our side. Please try again in a moment.')

        return
      }

      setStatus('success')
      setMessage('Thanks — we will be in touch when the next slot opens.')
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('We could not reach the server. Please check your connection and try again.')
    }
  }

  const busy = status === 'submitting'

  return (
    <section
      id='early-access'
      aria-labelledby='early-access-title'
      className='scroll-mt-20 overflow-hidden border-t border-border bg-white'
    >
      <div className='relative mx-auto max-w-6xl border-x border-border'>
        <div className='px-4 pb-14 pt-20 text-center sm:px-10 sm:pt-28'>
          <h2
            id='early-access-title'
            className='mx-auto max-w-4xl text-balance font-heading text-5xl font-normal leading-[1.02] tracking-[-0.045em] text-primary-strong sm:text-7xl lg:text-[5.5rem]'
          >
            Steady power for every peak
          </h2>

          <p className='reveal mx-auto mt-7 max-w-xl text-pretty text-base leading-relaxed text-primary-strong/85 sm:text-lg'>
            Gridora helps operators curtail less, earn more from every megawatt and keep a cleaner grid running on time.
          </p>

          <form onSubmit={onSubmit} noValidate className='reveal mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row'>
            <label htmlFor='early-access-email' className='sr-only'>
              Work email
            </label>

            <input
              id='early-access-email'
              name='email'
              type='email'
              autoComplete='email'
              placeholder='Enter your email'
              maxLength={200}
              disabled={busy}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (status !== 'idle') setStatus('idle')
              }}
              aria-invalid={status === 'error'}
              aria-describedby='early-access-status'
              className='h-12 w-full flex-1 rounded-full border border-input bg-white px-5 text-[15px] text-foreground transition-colors placeholder:text-primary-strong/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 aria-[invalid=true]:border-orange-600'
            />

            <div aria-hidden='true' className='absolute -left-[9999px] h-px w-px overflow-hidden'>
              <input ref={honeypotRef} type='text' tabIndex={-1} autoComplete='off' name='website' />
            </div>

            <Magnetic strength={0.18}>
              <button type='submit' disabled={busy} className={buttonClasses({ size: 'lg', className: 'w-full' })}>
                {busy ? (
                  <>
                    <LoaderCircle className='size-4 animate-spin' aria-hidden='true' />
                    Sending
                  </>
                ) : (
                  'Get started'
                )}
              </button>
            </Magnetic>
          </form>

          <p
            id='early-access-status'
            role='status'
            aria-live='polite'
            className={`mx-auto mt-4 flex max-w-xl items-start justify-center gap-2 text-sm leading-relaxed ${
              status === 'success' ? 'text-accent-foreground' : status === 'error' ? 'text-orange-700' : 'sr-only'
            }`}
          >
            {status === 'success' && <CircleCheck className='mt-0.5 size-4 shrink-0' aria-hidden='true' />}
            {status === 'error' && <CircleAlert className='mt-0.5 size-4 shrink-0' aria-hidden='true' />}
            {message}
          </p>
        </div>

        <div className='relative border-t border-border px-4 pb-12 pt-8 sm:px-10 sm:pb-16'>
          <motion.div
            ref={imageRef}
            style={still ? undefined : { scale: imageScale, y: imageY }}
            className='relative mx-auto max-w-5xl'
          >
            <SolarArrayViewer />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default EarlyAccessSection
