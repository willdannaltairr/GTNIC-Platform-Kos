import type { FC, FormEvent, ReactNode } from 'react'

import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonClasses } from '@/components/generals/button'
import {
  demoRequestLimits,
  interestOptions,
  portfolioOptions,
  roleOptions,
  validateDemoRequest,
} from '@/constants/demo-request'
import type { DemoRequestErrors, DemoRequestField, DemoRequestPayload } from '@/constants/demo-request'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const emptyForm: DemoRequestPayload = {
  fullName: '',
  workEmail: '',
  company: '',
  role: '',
  portfolioSize: '',
  interests: [],
  message: '',
}

const checklist = [
  'A live forecast for a site like yours',
  'Storage and trading scenarios for next week',
  'A rollout plan with timing and pricing',
]

const fieldOrder: DemoRequestField[] = [
  'fullName',
  'workEmail',
  'company',
  'role',
  'portfolioSize',
  'interests',
  'message',
]

const inputClasses =
  'mt-1.5 h-11 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 aria-[invalid=true]:border-orange-600 aria-[invalid=true]:focus:ring-orange-600/15'

const Required: FC = (): ReactNode => (
  <span aria-hidden='true' className='text-primary'>
    *
  </span>
)

const Optional: FC = (): ReactNode => <span className='font-normal text-muted-foreground'>(optional)</span>

interface FieldErrorProps {
  id: string
  message?: string
}

const FieldError: FC<FieldErrorProps> = ({ id, message }): ReactNode => {
  if (!message) return null

  return (
    <p id={id} role='alert' className='mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-orange-700'>
      <CircleAlert className='mt-px size-3.5 shrink-0' aria-hidden='true' />
      {message}
    </p>
  )
}

const DemoRequestSection: FC = (): ReactNode => {
  const [form, setForm] = useState<DemoRequestPayload>(emptyForm)
  const [errors, setErrors] = useState<DemoRequestErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const honeypotRef = useRef<HTMLInputElement>(null)
  const alertRef = useRef<HTMLParagraphElement>(null)

  const update = (field: DemoRequestField, value: string | string[]): void => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const toggleInterest = (value: string): void => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value],
    }))
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const payload: DemoRequestPayload = {
      ...form,
      fullName: form.fullName.trim(),
      workEmail: form.workEmail.trim(),
      company: form.company.trim(),
      message: form.message.trim(),
      website: honeypotRef.current?.value ?? '',
    }

    const found = validateDemoRequest(payload)

    if (Object.keys(found).length > 0) {
      setErrors(found)
      setStatus('error')
      setMessage('Please check the highlighted fields.')

      const first = fieldOrder.find((field) => found[field])
      if (first) document.getElementById(first)?.focus()

      return
    }

    setErrors({})
    setStatus('submitting')
    setMessage('')

    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = (await response.json().catch(() => ({}))) as { message?: string; errors?: DemoRequestErrors }

      if (!response.ok) {
        setStatus('error')
        setErrors(result.errors ?? {})
        setMessage(result.message || 'We could not send your request just now. Please try again in a moment.')
        alertRef.current?.focus()

        return
      }

      setForm(emptyForm)
      setStatus('success')
      setMessage('Thank you. A grid specialist will be in touch within one working day.')
      alertRef.current?.focus()
    } catch {
      setStatus('error')
      setMessage('We could not reach the server. Please check your connection and try again.')
      alertRef.current?.focus()
    }
  }

  const busy = status === 'submitting'

  return (
    <section id='get-started' aria-labelledby='get-started-title' className='scroll-mt-20 bg-background py-24 sm:py-32'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='relative isolate overflow-hidden rounded-[2.5rem] bg-forest'>
          <Image
            src='/images/hero-turbine.jpg'
            alt=''
            fill
            sizes='100vw'
            className='-z-20 object-cover object-[50%_65%] opacity-50'
          />

          <div
            aria-hidden='true'
            className='absolute inset-0 -z-10 bg-gradient-to-b from-forest via-forest/90 to-forest/60 lg:bg-gradient-to-r lg:from-forest lg:via-forest/85 lg:to-forest/30'
          />

          <div className='grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:p-14'>
            <div className='flex flex-col'>
              <div className='max-w-3xl'>
                <p className='inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-forest-foreground/85 ring-1 ring-white/15'>
                  <span aria-hidden='true' className='size-1.5 rounded-full bg-leaf' />
                  Book a demo
                </p>

                <h2
                  id='get-started-title'
                  className='mt-5 text-balance font-heading text-[2.15rem] font-light leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl'
                >
                  See your own portfolio forecast in 30 minutes.
                </h2>

                <p className='mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-forest-foreground/70 sm:text-lg'>
                  Share a few details and a grid specialist will walk you through Gridora using data from a site like
                  yours.
                </p>
              </div>

              <ul className='mt-8 space-y-3'>
                {checklist.map((itemText) => (
                  <li key={itemText} className='flex items-start gap-3 text-[15px] leading-relaxed text-white/90'>
                    <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-leaf/20 text-leaf'>
                      <Check className='size-3' aria-hidden='true' />
                    </span>

                    {itemText}
                  </li>
                ))}
              </ul>

              <p className='mt-auto pt-10 text-sm text-forest-foreground/65'>
                No commitment. Most demos are booked within two working days.
              </p>
            </div>

            <div className='rounded-[1.75rem] bg-white p-6 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] sm:p-8'>
              <form onSubmit={onSubmit} noValidate aria-describedby='demo-form-note'>
                <h3 className='text-lg font-medium text-foreground'>Request your demo</h3>

                <p id='demo-form-note' className='mt-1 text-sm text-muted-foreground'>
                  Fields marked with an asterisk are required.
                </p>

                <div className='mt-6 grid gap-4 sm:grid-cols-2'>
                  <div>
                    <label htmlFor='fullName' className='text-sm font-medium text-foreground'>
                      Full name <Required />
                    </label>

                    <input
                      id='fullName'
                      name='fullName'
                      type='text'
                      autoComplete='name'
                      required
                      maxLength={demoRequestLimits.fullName}
                      placeholder='Maren Holt'
                      disabled={busy}
                      value={form.fullName}
                      onChange={(event) => update('fullName', event.target.value)}
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      className={inputClasses}
                    />

                    <FieldError id='fullName-error' message={errors.fullName} />
                  </div>

                  <div>
                    <label htmlFor='workEmail' className='text-sm font-medium text-foreground'>
                      Work email <Required />
                    </label>

                    <input
                      id='workEmail'
                      name='workEmail'
                      type='email'
                      autoComplete='email'
                      required
                      maxLength={demoRequestLimits.workEmail}
                      placeholder='maren@company.com'
                      disabled={busy}
                      value={form.workEmail}
                      onChange={(event) => update('workEmail', event.target.value)}
                      aria-invalid={Boolean(errors.workEmail)}
                      aria-describedby={errors.workEmail ? 'workEmail-error' : undefined}
                      className={inputClasses}
                    />

                    <FieldError id='workEmail-error' message={errors.workEmail} />
                  </div>

                  <div>
                    <label htmlFor='company' className='text-sm font-medium text-foreground'>
                      Company <Required />
                    </label>

                    <input
                      id='company'
                      name='company'
                      type='text'
                      autoComplete='organization'
                      required
                      maxLength={demoRequestLimits.company}
                      placeholder='Northvale Energy'
                      disabled={busy}
                      value={form.company}
                      onChange={(event) => update('company', event.target.value)}
                      aria-invalid={Boolean(errors.company)}
                      aria-describedby={errors.company ? 'company-error' : undefined}
                      className={inputClasses}
                    />

                    <FieldError id='company-error' message={errors.company} />
                  </div>

                  <div>
                    <label htmlFor='role' className='text-sm font-medium text-foreground'>
                      Your role <Optional />
                    </label>

                    <div className='relative mt-1.5'>
                      <select
                        id='role'
                        name='role'
                        disabled={busy}
                        value={form.role}
                        onChange={(event) => update('role', event.target.value)}
                        className={cn(inputClasses, 'mt-0 appearance-none pr-10', !form.role && 'text-muted-foreground')}
                      >
                        <option value=''>Choose a role</option>

                        {roleOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        className='pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                        aria-hidden='true'
                      />
                    </div>
                  </div>

                  <div className='sm:col-span-2'>
                    <label htmlFor='portfolioSize' className='text-sm font-medium text-foreground'>
                      Portfolio size <Optional />
                    </label>

                    <div className='relative mt-1.5'>
                      <select
                        id='portfolioSize'
                        name='portfolioSize'
                        disabled={busy}
                        value={form.portfolioSize}
                        onChange={(event) => update('portfolioSize', event.target.value)}
                        className={cn(inputClasses, 'mt-0 appearance-none pr-10', !form.portfolioSize && 'text-muted-foreground')}
                      >
                        <option value=''>Choose your installed capacity</option>

                        {portfolioOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        className='pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
                        aria-hidden='true'
                      />
                    </div>
                  </div>

                  <fieldset className='sm:col-span-2'>
                    <legend className='text-sm font-medium text-foreground'>
                      What would you like to improve? <Optional />
                    </legend>

                    <div className='mt-2 flex flex-wrap gap-2'>
                      {interestOptions.map((option) => {
                        const active = form.interests.includes(option)

                        return (
                          <label key={option} className='cursor-pointer'>
                            <input
                              type='checkbox'
                              name='interests'
                              value={option}
                              checked={active}
                              disabled={busy}
                              onChange={() => toggleInterest(option)}
                              className='peer sr-only'
                            />

                            <span
                              className={cn(
                                'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm text-foreground ring-1 ring-black/10 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                                active ? 'bg-accent text-accent-foreground ring-primary/40' : 'bg-background',
                              )}
                            >
                              {option}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>

                  <div className='sm:col-span-2'>
                    <label htmlFor='message' className='text-sm font-medium text-foreground'>
                      Anything we should know? <Optional />
                    </label>

                    <textarea
                      id='message'
                      name='message'
                      rows={4}
                      maxLength={demoRequestLimits.message}
                      placeholder='Sites, markets you trade in, or the problem keeping you up at night.'
                      disabled={busy}
                      value={form.message}
                      onChange={(event) => update('message', event.target.value)}
                      className={cn(inputClasses, 'h-auto resize-y py-3 leading-relaxed')}
                    />
                  </div>
                </div>

                <div aria-hidden='true' className='absolute -left-[9999px] h-px w-px overflow-hidden'>
                  <label htmlFor='website'>Website</label>
                  <input ref={honeypotRef} id='website' name='website' type='text' tabIndex={-1} autoComplete='off' />
                </div>

                <div className='mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                  <p className='text-xs leading-relaxed text-muted-foreground sm:max-w-[16rem]'>
                    We only use your details to arrange your demo. Read our{' '}
                    <Link
                      href='/privacy'
                      className='font-medium text-foreground underline underline-offset-2 hover:text-primary'
                    >
                      privacy policy
                    </Link>
                    .
                  </p>

                  <button type='submit' disabled={busy} className={buttonClasses({ size: 'lg', className: 'w-full sm:w-auto' })}>
                    {busy ? (
                      <>
                        <LoaderCircle className='size-4 animate-spin' aria-hidden='true' />
                        Sending
                      </>
                    ) : (
                      <>
                        Request a demo
                        <ArrowRight className='size-4' aria-hidden='true' />
                      </>
                    )}
                  </button>
                </div>

                <p
                  ref={alertRef}
                  tabIndex={-1}
                  role='status'
                  aria-live='polite'
                  className={cn(
                    'mt-5 flex items-start gap-2 text-sm leading-relaxed focus:outline-none',
                    status === 'success' && 'text-accent-foreground',
                    status === 'error' && 'text-orange-700',
                    (status === 'idle' || status === 'submitting') && 'sr-only',
                  )}
                >
                  {status === 'success' && <CircleCheck className='mt-0.5 size-4 shrink-0' aria-hidden='true' />}
                  {status === 'error' && <CircleAlert className='mt-0.5 size-4 shrink-0' aria-hidden='true' />}
                  {message}
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DemoRequestSection
