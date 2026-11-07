'use client'

import type { FC, FormEvent, ReactNode } from 'react'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MapPin, Moon, Search, Sun } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { HERO, HERO_CITIES, type HeroSceneId } from '@/lib/landing'

const SCENE_IDS: HeroSceneId[] = ['pagi', 'malam']

/**
 * Hero landing.
 *
 * Tinggi 175svh dengan isi yang menempel di layar, sehingga foto tetap diam
 * sementara teks pudar dan kalimat penutup muncul — pola yang sama dengan
 * hero Gridora. Pemilih Pagi/Malam mengganti foto dan salinan sekaligus.
 *
 * Formulir pencarian di bagian bawah mengarah ke /kos dengan filter yang sudah
 * terisi, sama seperti pencarian di halaman /kos.
 */
const HeroSection: FC = (): ReactNode => {
  const router = useRouter()
  const [scene, setScene] = useState<HeroSceneId>('pagi')
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('')
  const still = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const lineOpacity = useTransform(scrollYProgress, [0, 0.55], [0, 1])
  const lineBlur = useTransform(scrollYProgress, [0, 0.55], ['blur(0px)', 'blur(10px)'])
  const lineScale = useTransform(scrollYProgress, [0, 0.55], [1, 0.92])

  const malam = scene === 'malam'
  const active = HERO.scenes[scene]

  // Tandai suasana di elemen dokumen supaya komponen lain (mis. header) bisa
  // ikut menyesuaikan tanpa berbagi state React.
  useEffect(() => {
    if (malam) document.documentElement.dataset.heroScene = 'malam'
    else delete document.documentElement.dataset.heroScene
  }, [malam])

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    const query = new URLSearchParams()
    if (keyword.trim()) query.set('q', keyword.trim())
    if (city) query.set('city', city)

    router.push(`/kos${query.toString() ? `?${query.toString()}` : ''}`)
  }

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="relative h-[175svh] bg-background">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0">
            <div
              className={cn(
                'absolute inset-0 transition-colors duration-[1400ms]',
                malam ? 'bg-[#0d1219]' : 'bg-[#dcd8cb]',
              )}
            />

            {/* Latar kabur: foto yang sama, diperbesar dan dilembutkan. */}
            {SCENE_IDS.map((id) => (
              <div
                key={`backdrop-${id}`}
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms] ease-in-out',
                  id === scene ? 'opacity-100' : 'opacity-0',
                )}
              >
                <Image
                  src={HERO.scenes[id].image}
                  alt=""
                  fill
                  priority={id === 'pagi'}
                  sizes="100vw"
                  className="scale-125 object-cover blur-2xl"
                />
              </div>
            ))}

            {/* Cahaya matahari pagi, lampu kamar saat malam. */}
            <div
              className={cn(
                'absolute -right-[12%] -top-[24%] size-[70vmax] rounded-full transition-opacity duration-[1400ms]',
                malam ? 'opacity-0' : 'opacity-100',
              )}
              style={{
                background: 'radial-gradient(closest-side, rgba(255,224,178,0.6), rgba(255,224,178,0) 70%)',
              }}
            />

            <div
              className={cn(
                'absolute inset-0 transition-opacity-[1600ms]',
                malam ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div
                className='absolute bottom-[8%] right-[8%] size-[42vmax] rounded-full'
                style={{
                  background: 'radial-gradient(closest-side, rgba(255,196,120,0.3), rgba(255,196,120,0) 70%)',
                }}
              />

              <div className='absolute bottom-[18%] right-[16%] size-16 rounded-full bg-[#ffd9a8] opacity-70 shadow-[0_0_90px_30px_rgba(255,190,120,0.35)] sm:size-24' />
            </div>

            <div className='hero-fog-slow absolute -inset-x-[15%] top-[22%] h-[34%]'>
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms]',
                  malam ? 'opacity-0' : 'opacity-100',
                )}
                style={{
                  background:
                    'radial-gradient(50% 50% at 30% 50%, rgba(244,241,230,0.7), transparent), radial-gradient(45% 45% at 75% 55%, rgba(244,241,230,0.5), transparent)',
                }}
              />
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms]',
                  malam ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                  background:
                    'radial-gradient(50% 50% at 30% 50%, rgba(70,84,98,0.45), transparent), radial-gradient(45% 45% at 75% 55%, rgba(70,84,98,0.35), transparent)',
                }}
              />
            </div>

            {/* Foto kamar: hanya suasana yang aktif yang terlihat. */}
            {SCENE_IDS.map((id) => (
              <div
                key={id}
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms] will-change-[opacity]',
                  id === scene ? 'opacity-100' : 'opacity-0',
                )}
              >
                {/* Bingkai foto mengikuti hero Gridora: di layar kecil bangunan
                    ditaruh di bawah judul sebagai panel 16:9, lalu di layar lebar
                    foto mengisi seluruh panggung dengan tepi yang melebur. */}
                <div className="hero-house-mask absolute bottom-[16%] left-1/2 aspect-video w-[150%] -translate-x-1/2 sm:bottom-[12%] sm:w-[125%] md:w-[110%] lg:inset-0 lg:aspect-auto lg:w-full lg:translate-x-0">
                  <Image
                    src={HERO.scenes[id].image}
                    alt={HERO.scenes[id].imageAlt}
                    fill
                    priority={id === 'pagi'}
                    sizes="(min-width: 1024px) 100vw, 150vw"
                    className="object-cover object-[50%_78%]"
                  />
                </div>
              </div>
            ))}

            <div className='hero-fog absolute -inset-x-[15%] bottom-[2%] h-[36%]'>
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms]',
                  malam ? 'opacity-0' : 'opacity-100',
                )}
                style={{
                  background:
                    'radial-gradient(45% 55% at 25% 60%, rgba(238,236,224,0.8), transparent), radial-gradient(40% 50% at 70% 70%, rgba(238,236,224,0.7), transparent)',
                }}
              />
              <div
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1400ms]',
                  malam ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                  background:
                    'radial-gradient(45% 55% at 25% 60%, rgba(52,64,76,0.6), transparent), radial-gradient(40% 50% at 70% 70%, rgba(52,64,76,0.5), transparent)',
                }}
              />
            </div>

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1400ms]',
                malam ? 'opacity-0' : 'opacity-100',
              )}
            >
              {/* Scrim atas menutup area judul sampai subjudul, lalu melepas
                  supaya fotonya tetap terbaca — bukan menutupi seluruh bagian tengah. */}
              <div className="absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-[#efede1] via-[#efede1]/70 to-transparent" />
              {/* Scrim bawah lebih tinggi dan lebih pekat: deskripsi dan
                  formulir pencarian perlu latar yang tenang untuk terbaca. */}
              <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-[#e4e2d4] via-[#e4e2d4]/90 to-transparent" />
            </div>

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1400ms]',
                malam ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className="absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-[#121920] via-[#121920]/65 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-[#151c23] via-[#151c23]/92 to-transparent" />
            </div>
          </div>

          <div
            className={cn(
              'absolute inset-0 bg-forest/40 transition-opacity duration-[1400ms]',
              malam ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>

        <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-between px-4 pb-8 pt-28 text-center sm:px-6 sm:pb-10 sm:pt-32 lg:px-8">
          <div className="max-w-3xl">
            {/* Label di atas judul, bukan paragraf di tengah foto: teks sepanjang
                itu tidak akan pernah terbaca di atas foto yang gelap tanpa
                menutupi gambarnya. Keterangan suasana sudah ada di bawah. */}
            <p className="flex justify-center">
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-700',
                  malam
                    ? 'bg-white/10 text-white ring-1 ring-white/25 backdrop-blur-md'
                    : 'bg-white/70 text-primary-strong ring-1 ring-white/60 backdrop-blur-md',
                )}
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                {HERO.badge}
              </span>
            </p>

            <h1
              id="hero-title"
              className="mt-4 font-heading text-[2.75rem] font-normal leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-[4.75rem]"
            >
              <span
                className={cn('block transition-colors duration-1000', malam ? 'text-white' : 'text-primary-strong')}
              >
                Biaya terang.
              </span>
              <span
                className={cn('block transition-colors duration-1000', malam ? 'text-leaf' : 'text-primary-strong/80')}
              >
                Kosnya tenang.
              </span>
            </h1>
          </div>

          <div className="w-full max-w-2xl">
            <div className="flex flex-col items-center gap-5">
              {/* Pemilih suasana: mengganti foto, salinan, dan warna teks. */}
              <div
                role="group"
                aria-label="Suasana kamar"
                className={cn(
                  'grid w-full max-w-md grid-cols-2 gap-1 rounded-2xl p-1.5 ring-1 backdrop-blur-xl transition-colors duration-700',
                  malam ? 'bg-forest-foreground/10 ring-white/20' : 'bg-white/45 ring-white/60',
                )}
              >
                {SCENE_IDS.map((id) => {
                  const item = HERO.scenes[id]
                  const isActive = id === scene
                  const Icon = id === 'pagi' ? Sun : Moon

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setScene(id)}
                      aria-pressed={isActive}
                      className="relative min-h-16 rounded-xl px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute inset-0 rounded-xl shadow-[0_14px_30px_-18px_rgba(14,26,18,0.55)]',
                            malam ? 'bg-forest' : 'bg-white/85',
                          )}
                        />
                      )}

                      <span
                        className={cn(
                          'relative flex items-center justify-center gap-2 text-base font-medium transition-colors duration-500',
                          malam
                            ? isActive
                              ? 'text-white'
                              : 'text-forest-foreground/65'
                            : isActive
                              ? 'text-forest'
                              : 'text-forest/65',
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {item.label}
                      </span>

                      <span
                        className={cn(
                          'relative mt-0.5 block text-xs transition-colors duration-500',
                          malam
                            ? isActive
                              ? 'text-forest-foreground/70'
                              : 'text-forest-foreground/50'
                            : 'text-forest/60',
                        )}
                      >
                        {item.caption}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div aria-live="polite" className="min-h-[3.25rem]">
                <p
                  className={cn(
                    'text-sm leading-relaxed transition-colors duration-700 sm:text-[15px]',
                    malam ? 'text-forest-foreground/85' : 'text-forest',
                    )}
                    >
                  {active.description}
                </p>
              </div>

              {/* Pencarian langsung dari hero — hasilnya dibuka di /kos. */}
              <form
                onSubmit={submit}
                className={cn(
                  'flex w-full flex-col gap-2 rounded-2xl p-2 ring-1 backdrop-blur-xl transition-colors duration-700 sm:flex-row sm:items-center',
                  malam ? 'bg-forest-foreground/10 ring-white/20' : 'bg-white/70 ring-white/70',
                )}
              >
                <label className="flex flex-1 items-center gap-2 rounded-xl bg-white/85 px-3 py-2.5">
                  <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">Kata kunci</span>
                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Nama kos, kampus, atau wilayah…"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2.5 sm:w-44">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">Kota</span>
                  <select
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="w-full bg-transparent text-sm text-foreground outline-none"
                  >
                    <option value="">Semua kota</option>
                    {HERO_CITIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Cari Kos
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Kalimat penutup yang muncul saat hero digulir. */}
        {!still && (
          <motion.p
            aria-hidden="true"
            style={{ opacity: lineOpacity, filter: lineBlur, scale: lineScale }}
            className={cn(
              'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center font-heading text-4xl font-light tracking-[-0.04em] drop-shadow-[0_2px_24px_rgba(11,36,20,0.45)] sm:text-6xl lg:text-7xl',
              malam ? 'text-white' : 'text-primary-strong',
            )}
          >
            Semua biaya, sejak awal.
          </motion.p>
        )}
      </div>
    </section>
  )
}

export default HeroSection
