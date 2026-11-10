'use client'

import type { FC, FormEvent, ReactNode } from 'react'
import type { Variants } from 'motion/react'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MapPin, Moon, Search, Sun } from 'lucide-react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import SplitReveal from '@/components/motion/split-reveal'
import { HERO, HERO_CITIES, type HeroSceneId } from '@/lib/landing'

const SCENE_IDS: HeroSceneId[] = ['pagi', 'malam']

const EASE = [0.22, 1, 0.36, 1] as const
const EXIT_EASE = [0.55, 0, 0.75, 0.2] as const

/**
 * Posisi bintang di langit malam.
 *
 * Ditulis sebagai daftar tetap, bukan diacak saat render: nilai acak membuat
 * posisinya berubah setiap kali halaman dimuat, dan bintang yang berpindah
 * tempat terbaca sebagai gambar yang gagal dimuat, bukan sebagai langit.
 *
 * Ukurannya hanya tiga nilai, 1,5 sampai 3 piksel, supaya tidak ada bintang
 * yang menonjol seperti noda. Jeda animasinya berselang 0,06 detik mengikuti
 * urutan daftar, sehingga kelap-kelipnya menyebar dan tidak berkedip serempak.
 */
const BINTANG: { left: string; top: string; size: number; delay: number }[] = [
  { left: '7%', top: '3%', size: 3, delay: 0 },
  { left: '44.3%', top: '20.9%', size: 1.5, delay: 0.61 },
  { left: '81.6%', top: '38.8%', size: 1.5, delay: 1.22 },
  { left: '18.9%', top: '12.7%', size: 2, delay: 1.83 },
  { left: '56.2%', top: '30.6%', size: 3, delay: 2.44 },
  { left: '93.5%', top: '4.5%', size: 1.5, delay: 3.05 },
  { left: '30.8%', top: '22.4%', size: 2, delay: 0.06 },
  { left: '68.1%', top: '40.3%', size: 1.5, delay: 0.67 },
  { left: '5.4%', top: '14.2%', size: 3, delay: 1.28 },
  { left: '42.7%', top: '32.1%', size: 2, delay: 1.89 },
  { left: '80%', top: '6%', size: 1.5, delay: 2.5 },
  { left: '17.3%', top: '23.9%', size: 1.5, delay: 3.11 },
  { left: '54.6%', top: '41.8%', size: 3, delay: 0.12 },
  { left: '91.9%', top: '15.7%', size: 1.5, delay: 0.73 },
  { left: '29.2%', top: '33.6%', size: 1.5, delay: 1.34 },
  { left: '66.5%', top: '7.5%', size: 2, delay: 1.95 },
  { left: '3.8%', top: '25.4%', size: 3, delay: 2.56 },
  { left: '41.1%', top: '43.3%', size: 1.5, delay: 3.17 },
  { left: '78.4%', top: '17.2%', size: 2, delay: 0.18 },
  { left: '15.7%', top: '35.1%', size: 1.5, delay: 0.79 },
  { left: '53%', top: '9%', size: 3, delay: 1.4 },
  { left: '90.3%', top: '26.9%', size: 2, delay: 2.01 },
  { left: '27.6%', top: '0.8%', size: 1.5, delay: 2.62 },
  { left: '64.9%', top: '18.7%', size: 1.5, delay: 3.23 },
  { left: '2.2%', top: '36.6%', size: 3, delay: 0.24 },
  { left: '39.5%', top: '10.5%', size: 1.5, delay: 0.85 },
  { left: '76.8%', top: '28.4%', size: 1.5, delay: 1.46 },
  { left: '14.1%', top: '2.3%', size: 2, delay: 2.07 },
]

/**
 * Ayunan bangunan saat hero pertama dibuka atau saat suasana diganti.
 *
 * Jeda pertama sengaja lebih panjang karena tirai pembuka masih menutup layar.
 * Setelah pengunjung memilih suasana sendiri, jedanya dipersingkat supaya
 * pergantian foto terasa langsung merespons.
 */
const houseVariants = (delay: number): Variants => ({
  below: { y: '42%', opacity: 0, scale: 0.96 },
  shown: {
    y: '0%',
    opacity: 1,
    scale: 1,
    transition: {
      y: { duration: 1.4, ease: EASE, delay },
      scale: { duration: 1.4, ease: EASE, delay },
      opacity: { duration: 0.55, ease: 'easeOut', delay },
    },
  },
  hidden: {
    y: '30%',
    opacity: 0,
    scale: 0.97,
    transition: {
      y: { duration: 0.6, ease: EXIT_EASE },
      scale: { duration: 0.6, ease: EXIT_EASE },
      opacity: { duration: 0.32, ease: 'easeIn' },
    },
  },
})

/**
 * Hero landing.
 *
 * Tinggi 175svh dengan isi yang menempel di layar, sehingga foto tetap diam
 * sementara teks pudar dan kalimat penutup muncul. Bingkai foto mengecil dan
 * membulat saat digulir, langit bergerak lebih lambat dari bangunan, dan kabut
 * mengambang pelan di kedua sisi. Pemilih Pagi/Malam mengganti foto, salinan,
 * dan suasana langit sekaligus: pagi memakai cahaya matahari di sudut kanan
 * atas, malam memakai langit berbintang dengan bulan.
 *
 * Formulir pencarian di bagian bawah mengarah ke halaman masuk, bukan langsung
 * ke /kos: hasil pencarian hanya bisa dibuka dengan akun, jadi menembak /kos
 * dari sini hanya akan memantulkan pengunjung kembali ke pintu masuk.
 */
const HeroSection: FC = (): ReactNode => {
  const router = useRouter()
  const [scene, setScene] = useState<HeroSceneId>('pagi')
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('')
  const [hasInteracted, setHasInteracted] = useState(false)
  const still = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  // Progres dihitung dari awal bagian sampai ujungnya menyentuh ujung layar.
  // Dengan begitu seluruh gerakan hero selesai tepat sebelum bagian berikutnya
  // masuk, bukan setelah hero sudah lama ditinggalkan.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const frameClip = useTransform(
    scrollYProgress,
    [0, 1],
    ['inset(0% 0% 0% 0% round 0px)', 'inset(11% 5% 11% 5% round 44px)'],
  )
  const frameScale = useTransform(scrollYProgress, [0, 1], [1, 1.14])
  const titleY = useTransform(scrollYProgress, [0, 0.6], [0, -140])
  const selectorY = useTransform(scrollYProgress, [0, 0.6], [0, 120])
  const introOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0])
  const overlayOpacity = useTransform(scrollYProgress, [0.55, 0.85], [0, 1])
  const lineScale = useTransform(scrollYProgress, [0.55, 1], [0.92, 1])
  const lineBlur = useTransform(scrollYProgress, [0.55, 0.85], ['blur(10px)', 'blur(0px)'])

  const malam = scene === 'malam'
  const houseEntranceDelay = hasInteracted ? 0.42 : 0.9

  // Tandai suasana di elemen dokumen supaya komponen lain (mis. header) bisa
  // ikut menyesuaikan tanpa berbagi state React.
  useEffect(() => {
    if (malam) document.documentElement.dataset.heroScene = 'malam'
    else delete document.documentElement.dataset.heroScene

    return () => {
      delete document.documentElement.dataset.heroScene
    }
  }, [malam])

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    // Kata kunci dan kota belum ikut dibawa ke halaman masuk: yang dibutuhkan
    // di sana hanya akun, dan setelah masuk pengunjung memulai pencariannya di
    // /kos dengan filter yang tersedia di halaman itu.
    router.push('/masuk')
  }

  const chooseScene = (id: HeroSceneId): void => {
    setHasInteracted(true)
    setScene(id)
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className={cn('relative bg-background', still ? 'h-svh' : 'h-[175svh]')}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden"
          style={still ? undefined : { clipPath: frameClip }}
        >
          <motion.div className="absolute inset-0" style={still ? undefined : { scale: frameScale }}>
            <div
              className={cn(
                'absolute inset-0 transition-colors duration-[1400ms]',
                malam ? 'bg-[#1b232c]' : 'bg-[#dcdccb]',
              )}
            />

            {/* Latar kabur: foto yang sama, diperbesar dan dilembutkan. */}
            {SCENE_IDS.map((id) => (
              <div
                key={`backdrop-${id}`}
                className={cn(
                  'absolute inset-0 transform-gpu will-change-[opacity]',
                  id === 'malam' && 'transition-opacity duration-[1400ms] ease-in-out',
                  id !== scene && 'opacity-0',
                )}
              >
                <Image
                  src={HERO.scenes[id].image}
                  alt=""
                  fill
                  priority={id === 'pagi'}
                  sizes="100vw"
                  className="scale-125 object-cover object-top blur-2xl"
                />
              </div>
            ))}

            {/* Cahaya matahari pagi: bulatan cahaya di luar sudut kanan atas,
                jadi yang terlihat hanya pantulannya di langit. */}
            <div
              className={cn(
                'absolute -right-[12%] -top-[24%] size-[70vmax] rounded-full transition-opacity duration-[1400ms]',
                malam ? 'opacity-0' : 'opacity-100',
              )}
              style={{
                background:
                  'radial-gradient(closest-side, rgba(255,221,180,0.55), rgba(255,221,180,0) 70%)',
              }}
            />

            {/* Langit malam: pendar bulan, bulannya sendiri, dan bintang.
                Warnanya sengaja biru pucat, bukan kuning hangat: kuning di
                langit malam terbaca sebagai lampu jalan, dan itu menyesatkan
                soal suasana yang sedang ditampilkan. */}
            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1600ms]',
                malam ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div
                className="absolute right-[6%] top-[4%] size-[34vmax] rounded-full"
                style={{
                  background:
                    'radial-gradient(closest-side, rgba(186,204,232,0.22), rgba(186,204,232,0) 70%)',
                }}
              />

              <div className="absolute right-[7%] top-[32%] size-8 rounded-full bg-[#eef1f6] opacity-85 shadow-[0_0_48px_14px_rgba(206,218,240,0.28)] sm:right-[17%] sm:top-[17%] sm:size-11" />

              {BINTANG.map((bintang, index) => (
                <span
                  key={`bintang-${index}`}
                  className="hero-star absolute rounded-full bg-white"
                  style={{
                    left: bintang.left,
                    top: bintang.top,
                    width: `${bintang.size}px`,
                    height: `${bintang.size}px`,
                    animationDelay: `${bintang.delay}s`,
                  }}
                />
              ))}
            </div>

            {/* Kabut tipis di langit dan di kaki bangunan. Lapisan ini bergerak
                sangat pelan, arahnya bergantian, sehingga foto terasa hidup
                tanpa menarik perhatian dari judul. */}
            <div className="hero-fog-slow absolute -inset-x-[15%] top-[22%] h-[34%]">
              <div
                className={cn(
                  'absolute inset-0 bg-[radial-gradient(50%_50%_at_30%_50%,rgba(244,241,230,0.65),transparent),radial-gradient(45%_45%_at_75%_55%,rgba(244,241,230,0.5),transparent)] transition-opacity duration-[1400ms]',
                  malam ? 'opacity-0' : 'opacity-100',
                )}
              />

              <div
                className={cn(
                  'absolute inset-0 bg-[radial-gradient(50%_50%_at_30%_50%,rgba(70,84,98,0.45),transparent),radial-gradient(45%_45%_at_75%_55%,rgba(70,84,98,0.35),transparent)] transition-opacity duration-[1400ms]',
                  malam ? 'opacity-100' : 'opacity-0',
                )}
              />
            </div>

            {/* Foto rumah: hanya suasana yang aktif yang terlihat. Bangunannya
                naik sedikit saat halaman dibuka, jadi hero-nya terasa datang
                dari bawah alih-alih muncul begitu saja.

                Visibilitas suasana diatur oleh varian motion, bukan kelas
                opacity. Kalau kelas dan varian dipasang di elemen yang sama,
                gaya inline dari motion akan menang dan kedua foto tetap
                terlihat, foto malam yang dirender terakhir selalu menimpa
                foto pagi. */}
            {SCENE_IDS.map((id) => (
              <motion.div
                key={id}
                variants={houseVariants(houseEntranceDelay)}
                initial={still ? false : 'below'}
                animate={id === scene ? 'shown' : 'hidden'}
                className="absolute inset-0 transform-gpu will-change-[transform,opacity]"
              >
                {/* Bingkai foto: di layar kecil bangunan ditaruh di bawah judul
                    sebagai panel 16:9, lalu di layar lebar foto mengisi seluruh
                    panggung dengan tepi yang melebur. */}
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
              </motion.div>
            ))}

            <div className="hero-fog absolute -inset-x-[15%] bottom-[2%] h-[36%]">
              <div
                className={cn(
                  'absolute inset-0 bg-[radial-gradient(45%_55%_at_25%_60%,rgba(238,236,224,0.8),transparent),radial-gradient(40%_50%_at_70%_70%,rgba(238,236,224,0.7),transparent)] transition-opacity duration-[1400ms]',
                  malam ? 'opacity-0' : 'opacity-100',
                )}
              />

              <div
                className={cn(
                  'absolute inset-0 bg-[radial-gradient(45%_55%_at_25%_60%,rgba(52,64,76,0.6),transparent),radial-gradient(40%_50%_at_70%_70%,rgba(52,64,76,0.5),transparent)] transition-opacity duration-[1400ms]',
                  malam ? 'opacity-100' : 'opacity-0',
                )}
              />
            </div>

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1400ms]',
                malam ? 'opacity-0' : 'opacity-100',
              )}
            >
              {/* Scrim atas menutup area judul, lalu melepas supaya fotonya
                  tetap terbaca, bukan menutupi seluruh bagian tengah. */}
              <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[#e9e7db]/80 via-[#e9e7db]/30 to-transparent" />
              {/* Scrim bawah lebih pekat: deskripsi dan formulir pencarian perlu
                  latar yang tenang untuk terbaca di atas foto. Di layar kecil
                  porsinya diperbesar karena pemilih suasana, deskripsi, dan
                  formulir bertumpuk menutupi bagian bawah foto. */}
              <div className="absolute inset-x-0 bottom-0 h-[54%] bg-gradient-to-t from-[#e4e2d4] via-[#e4e2d4]/90 to-transparent sm:h-[40%] sm:via-[#e4e2d4]/70 lg:h-[34%] lg:via-[#e4e2d4]/55" />
            </div>

            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-[1400ms]',
                malam ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className="absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[#121920]/75 via-[#121920]/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[54%] bg-gradient-to-t from-[#151c23] via-[#151c23]/90 to-transparent sm:h-[40%] sm:via-[#151c23]/70 lg:h-[34%] lg:via-[#151c23]/60" />
            </div>
          </motion.div>

          {!still && <motion.div className="absolute inset-0 bg-forest/40" style={{ opacity: overlayOpacity }} />}
        </motion.div>

        <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-between px-4 pb-8 pt-28 text-center sm:px-6 sm:pb-10 sm:pt-32 lg:px-8">
          <motion.div
            style={still ? undefined : { y: titleY, opacity: introOpacity }}
            className="max-w-3xl"
          >
            {/* Label di atas judul, bukan paragraf di tengah foto: teks sepanjang
                itu tidak akan pernah terbaca di atas foto yang gelap tanpa
                menutupi gambarnya. Keterangan suasana sudah ada di bawah. */}
            <p className="flex justify-center">
              <motion.span
                initial={still ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-md transition-colors duration-700',
                  malam
                    ? 'bg-white/10 text-white ring-1 ring-white/25'
                    : 'bg-white/70 text-primary-strong ring-1 ring-white/60',
                )}
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                {HERO.badge}
              </motion.span>
            </p>

            <h1
              id="hero-title"
              className="mt-4 font-heading text-[2.9rem] font-normal leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-[5.25rem]"
            >
              <SplitReveal
                text="Biaya terang."
                trigger="mount"
                delay={1.05}
                className={cn(
                  'block transition-colors duration-1000',
                  malam ? 'text-white' : 'text-primary-strong',
                )}
              />

              <SplitReveal
                text="Kosnya tenang."
                trigger="mount"
                delay={1.3}
                className={cn(
                  'block transition-colors duration-1000',
                  malam ? 'text-leaf' : 'text-white',
                )}
              />
            </h1>
          </motion.div>

          <motion.div
            style={still ? undefined : { y: selectorY, opacity: introOpacity }}
            className="w-full max-w-2xl"
          >
            <motion.div
              initial={still ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.7, ease: EASE }}
              className="flex flex-col items-center gap-5"
            >
              {/* Pemilih suasana: mengganti foto, salinan, langit, dan warna teks. */}
              <div
                role="group"
                aria-label="Suasana kamar"
                className={cn(
                  'grid w-full max-w-md grid-cols-2 gap-1 rounded-2xl p-1.5 ring-1 backdrop-blur-xl transition-colors duration-700',
                  malam ? 'bg-forest-foreground/10 ring-white/20' : 'bg-white/35 ring-white/60',
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
                      onClick={() => chooseScene(id)}
                      aria-pressed={isActive}
                      className="relative min-h-16 rounded-xl px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {isActive && (
                        <motion.span
                          layoutId="hero-scene-pill"
                          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
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

              {/* Pencarian langsung dari hero, hasilnya dibuka di /kos. */}
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
                    placeholder="Nama kos, kampus, atau wilayah..."
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
            </motion.div>
          </motion.div>
        </div>

        {/* Kalimat penutup yang muncul saat hero digulir. Latar hutan di atas
            foto memberi warna yang cukup gelap, sehingga teks putih tetap
            terbaca di kedua suasana. */}
        {!still && (
          <motion.p
            aria-hidden="true"
            style={{ opacity: overlayOpacity, filter: lineBlur, scale: lineScale }}
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center font-heading text-4xl font-light tracking-[-0.04em] text-white drop-shadow-[0_2px_24px_rgba(11,36,20,0.45)] sm:text-6xl lg:text-7xl"
          >
            Semua biaya, sejak awal.
          </motion.p>
        )}
      </div>
    </section>
  )
}

export default HeroSection
