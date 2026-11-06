'use client'

import type { FC, ReactNode } from 'react'

import { ArrowRight, BadgeCheck, Calculator, MapPinned } from 'lucide-react'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import SectionHeading from '@/components/landing/section-heading'
import MatchVisual from '@/components/landing/solutions/match-visual'
import CostVisual from '@/components/landing/solutions/cost-visual'
import RouteVisual from '@/components/landing/solutions/route-visual'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { useMediaQuery } from '@/hooks/use-media-query'
import { COST_DEMO, MATCH_DEMO, SOLUTION_STAGES, SOLUTION_UNDERNEATH } from '@/lib/landing'
import { formatRupiah } from '@/lib/format'

const stageIcons = [BadgeCheck, Calculator, MapPinned]

const monthlyTotal = COST_DEMO.rows.reduce((sum, row) => sum + row.amount, 0)
const upfrontTotal = monthlyTotal + COST_DEMO.deposit

const visuals: Record<string, ReactNode> = {
  kosmatch: <MatchVisual factors={MATCH_DEMO} />,
  truecost: (
    <CostVisual
      name={COST_DEMO.name}
      rows={COST_DEMO.rows.map((row) => ({
        label: row.label,
        amount: formatRupiah(row.amount),
        note: row.note,
        confirmed: row.confirmed,
      }))}
      monthlyTotal={formatRupiah(monthlyTotal)}
      upfrontTotal={formatRupiah(upfrontTotal)}
    />
  ),
  campusroute: <RouteVisual />,
}

/**
 * Bagian solusi.
 *
 * Di layar lebar, ketiga panel digeser ke samping selama bagian ini disematkan,
 * sehingga pembaca mengikuti alur alih-alih melewati tiga kartu terpisah. Di
 * layar sempit semuanya ditumpuk biasa dan tidak ada scroll horizontal.
 */
const SolutionsSection: FC = (): ReactNode => {
  const still = usePrefersReducedMotion()
  // Pergeseran horizontal hanya berlaku saat bagian ini tersemat, yaitu pada
  // layar `lg` ke atas. Di bawah itu kartunya ditumpuk biasa — kalau
  // transformasinya tetap dipasang, kartu ikut tergeser keluar layar.
  const desktop = useMediaQuery('(min-width: 1024px)')
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const shift = useTransform(scrollYProgress, [0, 1], ['0%', '-62%'])

  return (
    <section
      id="solusi"
      aria-labelledby="solusi-title"
      ref={sectionRef}
      className="relative scroll-mt-20 bg-background py-24 sm:py-32 lg:h-[calc(100svh+260svh)] lg:py-0"
    >
      <div className="lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:overflow-hidden lg:pb-10 lg:pt-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              id="solusi-title"
              eyebrow="Tiga alat"
              title="Cocok. Terhitung. Terjangkau."
              accent="Tiga pertanyaan, satu alur."
            />

            <div aria-hidden="true" className="relative hidden w-full max-w-md shrink-0 pb-1 lg:block">
              <div className="absolute inset-x-[7px] top-[7px] h-px bg-foreground/10" />

              <div className="relative flex justify-between">
                {SOLUTION_STAGES.map((stage, index) => {
                  const Icon = stageIcons[index]

                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        'flex flex-col gap-1.5',
                        index === 0
                          ? 'items-start text-left'
                          : index === 1
                            ? 'items-center text-center'
                            : 'items-end text-right',
                      )}
                    >
                      <span className="relative grid size-3.5 place-items-center rounded-full bg-background ring-1 ring-foreground/20">
                        <span className="absolute inset-0 rounded-full bg-primary shadow-[0_0_0_5px_rgba(30,133,56,0.16)]" />
                      </span>

                      <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Icon className="size-3.5 text-primary" aria-hidden="true" />
                        {stage.label}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {index === 0 ? 'Menyaring pilihan' : index === 1 ? 'Menghitung biaya' : 'Mengukur jarak'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 lg:mt-10 lg:min-h-0 lg:flex-1 lg:overflow-clip">
          <motion.div
            style={still || !desktop ? undefined : { x: shift }}
            className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:mx-0 lg:h-full lg:w-max lg:max-w-none lg:flex-row lg:gap-6 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]"
          >
            <div className="max-w-xl pb-4 lg:flex lg:w-[21rem] lg:max-w-none lg:shrink-0 lg:flex-col lg:justify-between lg:py-2">
              <p className="text-base leading-relaxed text-muted-foreground lg:text-lg">
                Gridora menggantikan tumpukan tangkapan layar, pesan WhatsApp yang tercecer, dan angka
                yang dihitung ulang di catatan pribadi. Setiap alat menjawab satu pertanyaan, lalu
                menyerahkan jawabannya ke alat berikutnya.
              </p>

              <p
                aria-hidden="true"
                className="mt-8 hidden items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-foreground/60 lg:flex"
              >
                Gulir untuk mengikuti alurnya
                <span className="relative h-px w-14 overflow-hidden bg-foreground/15">
                  <span className="flow-cue-line absolute inset-y-0 left-0 w-1/2 bg-primary" />
                </span>
              </p>
            </div>

            {SOLUTION_STAGES.map((stage, index) => {
              const dark = stage.tone === 'dark'
              const Icon = stageIcons[index]

              return (
                <article
                  key={stage.id}
                  id={stage.id}
                  className={cn(
                    'relative isolate overflow-hidden rounded-[2rem] scroll-mt-24 lg:h-full lg:w-[min(72vw,56rem)] lg:shrink-0',
                    dark ? 'bg-forest text-white' : 'bg-white text-foreground ring-1 ring-inset ring-black/5',
                  )}
                >
                  {dark && (
                    <>
                      <div className="absolute inset-y-0 -left-[12%] -right-[12%] -z-20">
                        <div className="absolute inset-0 bg-[url('/images/kos-1.jpg')] bg-cover bg-center" />
                      </div>

                      <div
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 bg-gradient-to-b from-forest via-forest/80 to-forest/30 lg:bg-gradient-to-r lg:from-forest lg:via-forest/85 lg:to-forest/15"
                      />
                    </>
                  )}

                  <div className="flex flex-col gap-8 p-6 sm:p-8 lg:h-full lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:p-10">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between gap-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium',
                            dark
                              ? 'bg-white/10 text-white ring-1 ring-white/15'
                              : 'bg-background text-foreground/75 ring-1 ring-black/5',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-6 items-center justify-center rounded-full',
                              dark ? 'bg-leaf text-forest' : 'bg-accent text-accent-foreground',
                            )}
                          >
                            <Icon className="size-3.5" aria-hidden="true" />
                          </span>
                          {stage.label}
                        </span>

                        <span className={cn('font-mono text-xs', dark ? 'text-white/50' : 'text-muted-foreground')}>
                          {stage.index} / 03
                        </span>
                      </div>

                      <h3
                        className={cn(
                          'mt-6 max-w-md font-heading text-3xl font-light leading-tight tracking-[-0.03em] sm:text-4xl lg:text-3xl xl:text-4xl',
                          dark ? 'text-white' : 'text-foreground',
                        )}
                      >
                        {stage.title}
                      </h3>

                      <p
                        className={cn(
                          'mt-4 max-w-md text-[15px] leading-relaxed',
                          dark ? 'text-forest-foreground/75' : 'text-muted-foreground',
                        )}
                      >
                        {stage.text}
                      </p>

                      <ul className="mt-6 space-y-2.5">
                        {stage.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className={cn(
                              'flex items-start gap-2.5 text-sm leading-relaxed',
                              dark ? 'text-forest-foreground/70' : 'text-muted-foreground',
                            )}
                          >
                            <ArrowRight
                              className={cn('mt-1 size-3.5 shrink-0', dark ? 'text-leaf' : 'text-primary')}
                              aria-hidden="true"
                            />
                            {bullet}
                          </li>
                        ))}
                      </ul>

                      <p
                        className={cn(
                          'mt-auto flex items-center gap-3 pt-8 text-sm leading-snug',
                          dark ? 'text-forest-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full ring-1',
                            dark
                              ? 'bg-white/10 text-leaf ring-white/15'
                              : 'bg-accent text-accent-foreground ring-black/5',
                          )}
                        >
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </span>

                        <span>
                          <span className={cn('font-medium', dark ? 'text-white' : 'text-foreground')}>
                            {index === 0 ? 'Lalu Simulasi Biaya.' : index === 1 ? 'Lalu Rute & Sekitar.' : 'Kembali ke KosMatch.'}
                          </span>{' '}
                          {index === 0
                            ? 'Pilihan yang tersaring dihitung biaya totalnya.'
                            : index === 1
                              ? 'Angka biaya dilengkapi jarak dan waktu tempuh.'
                              : 'Setiap kos yang Anda buka membuat rekomendasi berikutnya lebih tepat.'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center justify-center">{visuals[stage.id]}</div>
                  </div>
                </article>
              )
            })}
          </motion.div>
        </div>

        <div className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:mt-10 lg:px-8">
          <div className="flex flex-col gap-8">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
              Berlaku di semua alat
            </p>

            <ul className="grid gap-8 sm:grid-cols-3">
              {SOLUTION_UNDERNEATH.map((item) => {
                const Icon = item.icon

                return (
                  <li key={item.title} className="reveal flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-black/5">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>

                    <div>
                      <h3 className="text-base font-medium text-foreground">{item.title}</h3>

                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SolutionsSection
