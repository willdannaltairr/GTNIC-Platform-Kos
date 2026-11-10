'use client'

import type { FC, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { MotionValue } from 'motion/react'

import { ArrowRight, BadgeCheck, Calculator, MapPinned } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import SectionHeading from '@/components/landing/section-heading'
import SpotlightCard from '@/components/motion/spotlight-card'
import MatchVisual from '@/components/landing/solutions/match-visual'
import CostVisual from '@/components/landing/solutions/cost-visual'
import RouteVisual from '@/components/landing/solutions/route-visual'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { useMediaQuery } from '@/hooks/use-media-query'
import { ANCHOR_SCROLL_EVENT, type AnchorScrollDetail } from '@/lib/anchor-scroll'
import {
  COST_DEMO,
  MATCH_DEMO,
  SOLUTION_STAGES,
  SOLUTION_UNDERNEATH,
  type SolutionStage,
  type SolutionTheme,
} from '@/lib/landing'
import { formatRupiah } from '@/lib/format'

const stageIcons = [BadgeCheck, Calculator, MapPinned]
const stageNotes = ['Menyaring pilihan', 'Menghitung biaya', 'Mengukur jarak']
const stageAlign = ['items-start text-left', 'items-center text-center', 'items-end text-right']

interface StageThemeStyle {
  card: string
  title: string
  text: string
  chip: string
  chipIcon: string
  step: string
  bullet: string
  footerPill: string
  footerText: string
  footerStrong: string
  glow: string
  pattern: string
  photo?: string
  overlay?: string
}

/**
 * Tiga permukaan hijau dengan kedalaman berbeda: hijau pinus, hijau daun, dan
 * hijau lumut. Tidak ada kartu hitam; putih hanya muncul pada teks dan panel
 * visual di dalamnya.
 */
const stageThemes: Record<SolutionTheme, StageThemeStyle> = {
  forest: {
    card: 'bg-[#0f5132] text-white',
    title: 'text-white',
    text: 'text-forest-foreground/75',
    chip: 'bg-white/10 text-white ring-1 ring-white/15',
    chipIcon: 'bg-leaf text-forest',
    step: 'text-white/50',
    bullet: 'text-leaf',
    footerPill: 'bg-white/10 text-leaf ring-1 ring-white/15',
    footerText: 'text-forest-foreground/70',
    footerStrong: 'text-white',
    glow: 'bg-leaf/20',
    pattern: '',
    photo: '/images/kos-1.jpg',
    overlay:
      'bg-gradient-to-b from-[#0f5132] via-[#0f5132]/75 to-[#0f5132]/20 lg:bg-gradient-to-r lg:from-[#0f5132] lg:via-[#0f5132]/80 lg:to-[#0f5132]/10',
  },
  green: {
    card: 'bg-[#176c2d] text-white',
    title: 'text-white',
    text: 'text-[#d7eeda]/90',
    chip: 'bg-white/10 text-white ring-1 ring-white/20',
    chipIcon: 'bg-[#c9f0cf] text-[#0b3d24]',
    step: 'text-white/50',
    bullet: 'text-[#b7edc1]',
    footerPill: 'bg-white/10 text-[#b7edc1] ring-1 ring-white/15',
    footerText: 'text-[#d7eeda]/85',
    footerStrong: 'text-white',
    glow: 'bg-[#7bdc8d]/25',
    pattern:
      '[background-image:radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:20px_20px] opacity-40',
  },
  moss: {
    card: 'bg-[#2f6247] text-white',
    title: 'text-white',
    text: 'text-[#dcefe2]/85',
    chip: 'bg-white/10 text-white ring-1 ring-white/15',
    chipIcon: 'bg-[#c9f0cf] text-[#0f5132]',
    step: 'text-white/45',
    bullet: 'text-[#b7edc1]',
    footerPill: 'bg-white/10 text-[#b7edc1] ring-1 ring-white/15',
    footerText: 'text-[#dcefe2]/80',
    footerStrong: 'text-white',
    glow: 'bg-[#57c76a]/20',
    pattern:
      '[background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]',
  },
}

/** Tiga kartu penutup: hijau muda, putih, lalu hijau sedang. */
const underneathThemes = [
  {
    card: 'bg-[#e7f4e3] ring-primary/10',
    icon: 'bg-primary text-primary-foreground',
    title: 'text-forest',
    text: 'text-forest/70',
  },
  {
    card: 'bg-white ring-black/5',
    icon: 'bg-forest text-white',
    title: 'text-forest',
    text: 'text-forest/70',
  },
  {
    card: 'bg-[#176c2d] ring-white/10',
    icon: 'bg-[#c9f0cf] text-[#0f5132]',
    title: 'text-white',
    text: 'text-white/75',
  },
]

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

interface PipelineMetrics {
  distance: number
  centers: number[]
}

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1)

/** Progres perjalanan horizontal, dipetakan dari awal sampai akhir bagian. */
const normalizePipeline = (value: number): number => clamp01((value - 0.05) / 0.9)

/**
 * Mengubah progres horizontal menjadi isi garis penghubung tiga tahap.
 *
 * Setiap tahap memegang setengah ruas garis: tahap pertama membawa isi dari
 * nol ke tengah, tahap kedua dari tengah ke ujung. Dengan begitu ujung garis
 * selalu berhenti tepat di tahap yang sedang berada di tengah layar.
 */
function interpolateStageProgress(progress: number, centers: number[]): number {
  const [first, middle, last] = centers.length === 3 ? centers : [0, 0.5, 1]

  if (progress <= first) return 0
  if (progress <= middle) return ((progress - first) / Math.max(middle - first, 1e-4)) * 0.5
  if (progress <= last) return 0.5 + ((progress - middle) / Math.max(last - middle, 1e-4)) * 0.5
  return 1
}

interface StageMarkerProps {
  progress: MotionValue<number>
  at: number
  label: string
  note: string
  align: string
}

/** Satu titik tahap di garis penghubung, menyala saat garis mencapainya. */
const StageMarker: FC<StageMarkerProps> = ({ progress, at, label, note, align }): ReactNode => {
  const dot = useTransform(progress, [at - 0.04, at], [0, 1])
  const text = useTransform(dot, [0, 1], [0.45, 1])

  return (
    <li className={cn('flex flex-col gap-1.5', align)}>
      <span className="relative size-3.5 rounded-full bg-background ring-1 ring-foreground/20">
        <motion.span
          className="absolute inset-0 rounded-full bg-primary shadow-[0_0_0_5px_rgba(30,133,56,0.16)]"
          style={{ opacity: dot, scale: dot }}
        />
      </span>

      <motion.span
        style={{ opacity: text }}
        className="mt-2 text-sm font-medium text-foreground"
      >
        {label}
      </motion.span>

      <motion.span style={{ opacity: text }} className="text-xs text-muted-foreground">
        {note}
      </motion.span>
    </li>
  )
}

interface SolutionProgressProps {
  progress: MotionValue<number>
}

/**
 * Garis kemajuan di atas deretan tahap.
 *
 * Isi garis memanjang mengikuti guliran, dan titik cahayanya ikut bergerak di
 * ujung isi. Titik tahap baru menyala setelah garis benar-benar sampai di
 * posisinya, jadi urutannya terbaca sebagai satu alur, bukan tiga status
 * terpisah.
 */
const SolutionProgress: FC<SolutionProgressProps> = ({ progress }): ReactNode => {
  const dotLeft = useTransform(progress, (value) => `${value * 100}%`)

  return (
    <div aria-hidden="true" className="relative hidden w-full max-w-md shrink-0 pb-1 lg:block">
      <div className="absolute inset-x-[7px] top-[7px] h-px bg-foreground/10">
        <motion.div
          className="absolute inset-0 origin-left bg-gradient-to-r from-leaf to-primary"
          style={{ scaleX: progress }}
        />

        <motion.span
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf shadow-[0_0_12px_2px_rgba(87,199,106,0.65)]"
          style={{ left: dotLeft }}
        />
      </div>

      <ol className="relative flex justify-between">
        {SOLUTION_STAGES.map((stage, index) => (
          <StageMarker
            key={stage.id}
            progress={progress}
            at={index / (SOLUTION_STAGES.length - 1)}
            label={stage.label}
            note={stageNotes[index]}
            align={stageAlign[index]}
          />
        ))}
      </ol>
    </div>
  )
}

interface StageCardProps {
  stage: SolutionStage
  index: number
  icon: LucideIcon
  visual: ReactNode
  pinned: boolean
  compact: boolean
  pipeline: MotionValue<number>
  metrics: MotionValue<PipelineMetrics>
}

/**
 * Satu panel tahap.
 *
 * Saat bagian ini tersemat, panel yang berada di tengah layar tampil penuh,
 * sedangkan panel di kiri dan kanannya sedikit mengecil dan meredup. Gerakan
 * ini memberi kedalaman pada perjalanan horizontal tanpa mengubah isi panel.
 */
const StageCard: FC<StageCardProps> = ({
  stage,
  index,
  icon: Icon,
  visual,
  pinned,
  compact,
  pipeline,
  metrics,
}): ReactNode => {
  // Progres dibaca lebih dulu supaya useTransform ikut berlangganan perubahan
  // guliran sejak render pertama. Bila pembacaan ini diletakkan setelah
  // pemeriksaan jarak, nilai fokus tidak pernah diperbarui dan kartu kedua
  // serta ketiga akan tertahan redup selama bagian tersemat.
  const offset = useTransform(() => {
    const progress = pipeline.get()
    const { distance, centers } = metrics.get()
    const center = centers[index]

    return distance <= 0 || center === undefined ? 0 : progress - center
  })

  const focus = useTransform(offset, (value) => 1 - Math.min(Math.abs(value) / 0.45, 1))
  const scale = useTransform(focus, [0, 1], [0.9, 1])
  const opacity = useTransform(focus, [0, 1], [0.5, 1])
  const visualY = useTransform(focus, [0, 1], [56, 0])
  const backgroundX = useTransform(offset, [-1, 1], [-140, 140])

  const theme = stageThemes[stage.theme]

  return (
    <motion.article
      data-panel=""
      data-stage=""
      id={stage.id}
      style={pinned ? { scale, opacity } : undefined}
      className={cn(
        'relative isolate overflow-hidden rounded-[2rem] scroll-mt-24',
        theme.card,
        pinned && 'lg:h-full lg:w-[min(72vw,56rem)] lg:shrink-0',
      )}
    >
      {theme.photo && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-y-0 -left-[12%] -right-[12%] -z-20"
          style={pinned ? { x: backgroundX } : undefined}
        >
          <div
            className="absolute inset-0 bg-cover bg-[position:50%_75%]"
            style={{ backgroundImage: `url('${theme.photo}')` }}
          />
        </motion.div>
      )}

      {theme.overlay && <div aria-hidden="true" className={cn('absolute inset-0 -z-10', theme.overlay)} />}

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -right-24 -top-24 -z-10 size-72 rounded-full blur-3xl',
          theme.glow,
        )}
      />

      {theme.pattern && <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 -z-10', theme.pattern)} />}

      <div
        className={cn(
          'flex flex-col gap-8 p-6 sm:p-8',
          pinned &&
            'lg:grid lg:h-full lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:p-10',
          compact && 'lg:gap-8 lg:p-6',
        )}
      >
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium',
                theme.chip,
              )}
            >
              <span
                className={cn('flex size-6 items-center justify-center rounded-full', theme.chipIcon)}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              {stage.label}
            </span>

            <span className={cn('font-mono text-xs', theme.step)}>{stage.index} / 03</span>
          </div>

          <h3
            className={cn(
              'mt-6 max-w-md font-heading text-3xl font-light leading-tight tracking-[-0.03em] sm:text-4xl lg:text-3xl xl:text-4xl',
              theme.title,
            )}
          >
            {stage.title}
          </h3>

          <p className={cn('mt-4 max-w-md text-[15px] leading-relaxed', theme.text)}>
            {stage.text}
          </p>

          <ul className="mt-3 space-y-1">
            {stage.bullets.map((bullet) => (
              <li
                key={bullet}
                className={cn('flex items-start gap-2.5 text-[13px] leading-[1.55]', theme.text)}
              >
                <ArrowRight
                  className={cn('mt-1 size-3.5 shrink-0', theme.bullet)}
                  aria-hidden="true"
                />
                {bullet}
              </li>
            ))}
          </ul>

          <p
            className={cn(
              'mt-auto flex items-center gap-3 pt-6 text-sm leading-snug',
              theme.footerText,
              compact && 'pt-4',
            )}
          >
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full',
                theme.footerPill,
              )}
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>

            <span>
              <span className={cn('font-medium', theme.footerStrong)}>
                {index === 0
                  ? 'Lalu Simulasi Biaya.'
                  : index === 1
                    ? 'Lalu Rute & Sekitar.'
                    : 'Kembali ke KosMatch.'}
              </span>{' '}
              {index === 0
                ? 'Pilihan yang tersaring dihitung biaya totalnya.'
                : index === 1
                  ? 'Angka biaya dilengkapi jarak dan waktu tempuh.'
                  : 'Setiap kos yang Anda buka membuat rekomendasi berikutnya lebih tepat.'}
            </span>
          </p>
        </div>

        <motion.div
          style={pinned ? { y: visualY } : undefined}
          className="flex items-center justify-center"
        >
          {visual}
        </motion.div>
      </div>
    </motion.article>
  )
}

/**
 * Bagian solusi.
 *
 * Di layar lebar, keempat panel digeser ke samping selama bagian ini disematkan,
 * sehingga pembaca mengikuti alur alih-alih melewati kartu terpisah. Garis di
 * atas deretan tahap ikut terisi mengikuti posisi panel, dan panel yang berada
 * di tengah layar tampil paling tegas. Di layar sempit semuanya ditumpuk biasa
 * dan tidak ada scroll horizontal.
 */
const SolutionsSection: FC = (): ReactNode => {
  const still = usePrefersReducedMotion()
  // Jalur horizontal dipakai selama layar cukup lebar dan tidak terlalu
  // pendek. Ambang tingginya sengaja rendah supaya laptop biasa ikut mendapat
  // gerakannya; yang dihindari hanya jendela sangat pendek, tempat panel
  // setinggi layar tidak lagi memuat judul, rincian, dan visualnya tanpa
  // terpotong.
  const roomyDesktop = useMediaQuery('(min-width: 1024px) and (min-height: 620px)')
  // Pinned juga dimatikan saat pengunjung memilih reduced motion.
  const pinned = roomyDesktop && !still
  // Di jendela yang tinggi layarnya sedang, jarak antarbagian dirapatkan.
  // Jendela setinggi ini dulu tidak mendapat jalur horizontal sama sekali
  // (ambangnya 900px); sekarang jalurnya tetap jalan dengan tata letak rapat,
  // supaya judul, panel tahap, dan kartu penutupnya tidak terpotong tepi layar.
  const shortViewport = useMediaQuery('(max-height: 900px)')
  const compact = pinned && shortViewport

  const sectionRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const metrics = useMotionValue<PipelineMetrics>({ distance: 0, centers: [] })

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const pipeline = useTransform(scrollYProgress, normalizePipeline)
  const shift = useTransform(() => -pipeline.get() * metrics.get().distance)
  const stageProgress = useTransform(() =>
    interpolateStageProgress(pipeline.get(), metrics.get().centers),
  )

  useEffect(() => {
    const section = sectionRef.current

    if (!pinned) {
      metrics.set({ distance: 0, centers: [] })
      section?.style.removeProperty('--pipeline-distance')
      return
    }

    const viewport = viewportRef.current
    const track = trackRef.current

    if (!section || !viewport || !track) return

    const measure = (): void => {
      const distance = Math.max(track.offsetWidth - viewport.clientWidth, 0)
      const halfViewport = viewport.clientWidth / 2
      const centers =
        distance > 0
          ? Array.from(track.querySelectorAll<HTMLElement>('[data-stage]')).map(
              (element) => (element.offsetLeft + element.offsetWidth / 2 - halfViewport) / distance,
            )
          : []

      metrics.set({ distance, centers })

      if (distance > 0) {
        section.style.setProperty('--pipeline-distance', `${Math.round(distance * 1.15)}px`)
      } else {
        section.style.removeProperty('--pipeline-distance')
      }
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(track)

    return () => observer.disconnect()
  }, [metrics, pinned])

  /**
   * Menjaga tautan jangkar tahap tetap tepat saat jalur horizontal tersemat.
   *
   * Posisi statis ketiga kartu berada di awal bagian, jadi tautan ke tahap
   * kedua atau ketiga akan berhenti di tempat yang salah bila dibiarkan.
   * Efek ini memetakan nama tahap ke posisi gulir yang membuat kartunya
   * berhenti di tengah layar, lalu mengambil alih tautan dari penggulungan
   * bawaan.
   */
  useEffect(() => {
    if (!pinned) return

    const section = sectionRef.current
    if (!section) return

    const stageIndex = (hash: string): number =>
      SOLUTION_STAGES.findIndex((stage) => stage.id === hash)

    const scrollTopFor = (index: number): number | null => {
      const { distance, centers } = metrics.get()
      const center = centers[index]

      if (distance <= 0 || center === undefined) return null

      const span = section.offsetHeight - window.innerHeight

      if (span <= 0) return null

      // Kebalikan dari normalizePipeline: pusat tahap harus jatuh di tengah
      // layar, bukan di ujung bagian.
      const progress = clamp01(center * 0.9 + 0.05)

      return section.getBoundingClientRect().top + window.scrollY + progress * span
    }

    const scrollToStage = (hash: string, scrollTo: (top: number) => void): void => {
      const index = stageIndex(hash)
      if (index < 0) return

      const top = scrollTopFor(index)
      if (top === null) return

      scrollTo(top)
    }

    const onAnchorScroll = (event: Event): void => {
      const detail = (event as CustomEvent<AnchorScrollDetail>).detail
      const index = stageIndex(detail.hash)
      if (index < 0) return

      const top = scrollTopFor(index)
      if (top === null) return

      event.preventDefault()
      detail.scrollTo(top)
    }

    const onHashChange = (): void => {
      const hash = decodeURIComponent(window.location.hash.slice(1))

      scrollToStage(hash, (top) => {
        window.scrollTo({ top, behavior: 'auto' })
      })
    }

    section.addEventListener(ANCHOR_SCROLL_EVENT, onAnchorScroll)
    window.addEventListener('hashchange', onHashChange)

    // Saat halaman dibuka langsung dari tautan tahap, peramban bisa sudah
    // menggulir ke posisi statis kartu. Dua bingkai memberi waktu tata letak
    // dan penggulungan bawaan selesai sebelum posisinya dikoreksi.
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(onHashChange)
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      section.removeEventListener(ANCHOR_SCROLL_EVENT, onAnchorScroll)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [metrics, pinned])

  return (
    <section
      id="solusi"
      aria-labelledby="solusi-title"
      ref={sectionRef}
      className={cn(
        'relative scroll-mt-20 bg-background py-24 sm:py-32',
        pinned && 'lg:h-[calc(100svh+var(--pipeline-distance,_260svh))] lg:py-0',
      )}
    >
      <div
        className={cn(
          pinned && 'lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:overflow-hidden lg:pb-10 lg:pt-20',
          compact && 'lg:pb-5 lg:pt-14',
        )}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              id="solusi-title"
              eyebrow="Tiga alat"
              title="Cocok. Terhitung. Terjangkau."
              accent="Tiga pertanyaan, satu alur."
            />

            {pinned && <SolutionProgress progress={stageProgress} />}
          </div>
        </div>

        <div
          ref={viewportRef}
          onFocusCapture={(event) => {
            // Panel yang menerima fokus keyboard ikut dibawa ke tengah jalur,
            // sama seperti saat pengunjung menggulir dengan tangan.
            if (!pinned) return

            const section = sectionRef.current
            const viewport = viewportRef.current
            const { distance } = metrics.get()
            const panel =
              event.target instanceof HTMLElement
                ? event.target.closest<HTMLElement>('[data-panel]')
                : null

            if (!section || !viewport || distance <= 0 || !panel) return

            const center = clamp01(
              (panel.offsetLeft + panel.offsetWidth / 2 - viewport.clientWidth / 2) / distance,
            )
            const top = section.getBoundingClientRect().top + window.scrollY
            const span = section.offsetHeight - window.innerHeight

            if (span > 0) {
              window.scrollTo({ top: top + (0.05 + 0.9 * center) * span })
            }
          }}
          className={cn(
            'mt-12',
            pinned && 'lg:mt-10 lg:min-h-0 lg:flex-1 lg:overflow-clip',
            compact && 'lg:mt-6',
          )}
        >
          <motion.div
            ref={trackRef}
            style={pinned ? { x: shift } : undefined}
            className={cn(
              'relative mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:px-8',
              pinned &&
                'lg:mx-0 lg:h-full lg:w-max lg:max-w-none lg:flex-row lg:gap-6 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:will-change-transform',
            )}
          >
            <div
              data-panel=""
              className={cn(
                'max-w-xl pb-4',
                pinned && 'lg:flex lg:w-[21rem] lg:max-w-none lg:shrink-0 lg:flex-col lg:justify-between lg:py-2',
              )}
            >
              <p
                className={cn(
                  'text-base leading-relaxed text-muted-foreground lg:text-lg',
                  compact && 'lg:text-base',
                )}
              >
                HuniKos menggantikan tumpukan tangkapan layar, pesan WhatsApp yang tercecer, dan angka
                yang dihitung ulang di catatan pribadi. Setiap alat menjawab satu pertanyaan, lalu
                menyerahkan jawabannya ke alat berikutnya.
              </p>

              {pinned && (
                <p
                  aria-hidden="true"
                  className={cn(
                    'mt-8 hidden items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-foreground/60 lg:flex',
                    compact && 'mt-4',
                  )}
                >
                  Gulir untuk mengikuti alurnya
                  <span className="relative h-px w-14 overflow-hidden bg-foreground/15">
                    <span className="flow-cue-line absolute inset-y-0 left-0 w-1/2 bg-primary" />
                  </span>
                </p>
              )}
            </div>

            {SOLUTION_STAGES.map((stage, index) => (
              <StageCard
                key={stage.id}
                stage={stage}
                index={index}
                icon={stageIcons[index]}
                visual={visuals[stage.id]}
                pinned={pinned}
                compact={compact}
                pipeline={pipeline}
                metrics={metrics}
              />
            ))}

            {/* Berlaku di semua alat. Di layar lebar panel ini menjadi tujuan
                terakhir perjalanan horizontal, muncul setelah ketiga tahap
                selesai dibaca. */}
            <div
              data-panel=""
              className={cn(
                'pt-4',
                pinned && 'lg:flex lg:h-full lg:w-[24rem] lg:shrink-0 lg:flex-col lg:pt-0',
              )}
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Berlaku di semua alat
              </p>

              <ul
                className={cn(
                  'mt-4 grid gap-4 md:grid-cols-3',
                  pinned && 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-3',
                  compact && 'lg:gap-2',
                )}
              >
                {SOLUTION_UNDERNEATH.map((item, index) => {
                  const Icon = item.icon
                  const theme = underneathThemes[index % underneathThemes.length]

                  return (
                    <SpotlightCard
                      key={item.title}
                      as="li"
                      className={cn(
                        'rounded-[1.5rem] p-6 ring-1 ring-inset',
                        theme.card,
                        pinned && 'lg:flex-1 lg:p-5',
                        compact && 'lg:p-4',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl',
                            theme.icon,
                          )}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </span>

                        <h3 className={cn('text-base font-medium', theme.title)}>{item.title}</h3>
                      </div>

                      <p
                        className={cn(
                          'mt-3 text-sm leading-relaxed',
                          theme.text,
                          compact && 'mt-2 text-[13px]',
                        )}
                      >
                        {item.text}
                      </p>
                    </SpotlightCard>
                  )
                })}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default SolutionsSection
