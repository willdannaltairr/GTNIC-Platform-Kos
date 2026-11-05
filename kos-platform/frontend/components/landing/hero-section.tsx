'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import { HERO, HERO_STATS } from '@/lib/constants'

const CITY_OPTIONS = [
  'Jakarta Selatan',
  'Bandung',
  'Sleman',
  'Surabaya',
  'Malang',
  'Depok',
]

/**
 * Hero beranda: menjelaskan nilai utama platform, dengan pencarian langsung
 * ke halaman /kos (filter tercermin di URL).
 */
export function HeroSection() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = new URLSearchParams()
    if (keyword.trim()) query.set('q', keyword.trim())
    if (city) query.set('city', city)
    router.push(`/kos${query.toString() ? `?${query.toString()}` : ''}`)
  }

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pb-20 lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-leaf-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {HERO.badge}
          </span>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
            {HERO.title}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            {HERO.subtitle}
          </p>

          <form
            onSubmit={submit}
            className="mt-7 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"
          >
            <label className="flex flex-1 items-center gap-2 rounded-xl bg-muted px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">Kata kunci</span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Nama kos, kampus, atau wilayah…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 sm:w-44">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">Kota</span>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              >
                <option value="">Semua kota</option>
                {CITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
            >
              Cari Kos
            </button>
          </form>

          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {HERO_STATS.map((stat) => (
              <div key={stat.value}>
                <dt className="text-sm font-bold text-primary">{stat.value}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="hero-photo-mask relative aspect-[4/3] overflow-hidden rounded-2xl bg-mist">
            <Image
              src="/images/hero-kamar.png"
              alt="Kamar tidur dengan lampu meja kayu dan pencahayaan hangat"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 520px"
              className="object-cover"
            />
          </div>

          <div className="absolute -bottom-3 left-4 right-4 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur sm:left-8 sm:right-8">
            <p className="text-xs font-semibold text-foreground">Estimasi biaya transparan</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Sewa, deposit, listrik, air, dan internet dihitung sejak awal — lengkap dengan label
              seberapa lengkap datanya.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
