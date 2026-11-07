'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import {
  BATHROOM_OPTIONS,
  FACILITY_FILTERS,
  SORT_OPTIONS,
  TYPE_OPTIONS,
} from '@/lib/constants'

export interface KosFilterState {
  q: string
  city: string
  district: string
  type: string
  bathroom: string
  minPrice: string
  maxPrice: string
  facilities: string[]
  sort: string
}

/**
 * Panel filter pencarian kos.
 *
 * Nilai awal datang dari URL (server component membacanya), dan saat
 * diterapkan seluruh pilihan ditulis kembali ke URL — sehingga hasil
 * pencarian bisa dibagikan atau dibuka ulang persis sama.
 *
 * Susunannya melebar mengikuti halaman — bukan satu kolom sempit di samping
 * hasil. Filter adalah hal pertama yang dicari pengunjung, dan sebagai satu
 * blok selebar halaman ia muat tanpa memakan lebar yang dibutuhkan kartu kos.
 * Urutan barisnya sengaja tetap: kata kunci (paling sering dipakai) di baris
 * pertama, lalu wilayah, lalu penyaring yang lebih jarang disentuh.
 */
export function KosFilters({ initial }: { initial: KosFilterState }) {
  const router = useRouter()

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const params = new URLSearchParams()

    const setIfFilled = (key: string, value: string) => {
      const trimmed = value.trim()
      if (trimmed) params.set(key, trimmed)
    }

    setIfFilled('q', String(form.get('q') ?? ''))
    setIfFilled('city', String(form.get('city') ?? ''))
    setIfFilled('district', String(form.get('district') ?? ''))
    setIfFilled('type', String(form.get('type') ?? ''))
    setIfFilled('bathroom', String(form.get('bathroom') ?? ''))
    setIfFilled('minPrice', String(form.get('minPrice') ?? ''))
    setIfFilled('maxPrice', String(form.get('maxPrice') ?? ''))

    const facilities = form.getAll('facilities').map(String).filter(Boolean)
    if (facilities.length > 0) params.set('facilities', facilities.join(','))

    const sort = String(form.get('sort') ?? 'newest')
    if (sort && sort !== 'newest') params.set('sort', sort)

    router.push(`/kos${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Filter pencarian"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kata kunci memakan dua kolom: inilah isian yang paling sering
            dipakai, dan teks pencarian seperti "kos dekat UI" tidak terbaca
            utuh di kolom selebar satu isian. */}
        <div className="sm:col-span-2">
          <label htmlFor="filter-q" className="text-sm font-semibold text-foreground">
            Kata kunci
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              id="filter-q"
              name="q"
              defaultValue={initial.q}
              placeholder="Nama kos, wilayah, atau alamat"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-city" className="text-sm font-semibold text-foreground">
            Kota
          </label>
          <input
            id="filter-city"
            name="city"
            defaultValue={initial.city}
            placeholder="Contoh: Bandung"
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="filter-district" className="text-sm font-semibold text-foreground">
            Kecamatan
          </label>
          <input
            id="filter-district"
            name="district"
            defaultValue={initial.district}
            placeholder="Contoh: Coblong"
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="filter-type" className="text-sm font-semibold text-foreground">
            Tipe kos
          </label>
          <select
            id="filter-type"
            name="type"
            defaultValue={initial.type}
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="">Semua tipe</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-bathroom" className="text-sm font-semibold text-foreground">
            Kamar mandi
          </label>
          <select
            id="filter-bathroom"
            name="bathroom"
            defaultValue={initial.bathroom}
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="">Semua</option>
            {BATHROOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-min-price" className="text-sm font-semibold text-foreground">
            Harga minimum
          </label>
          <input
            id="filter-min-price"
            name="minPrice"
            type="number"
            min={0}
            defaultValue={initial.minPrice}
            placeholder="Rp"
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="filter-max-price" className="text-sm font-semibold text-foreground">
            Harga maksimum
          </label>
          <input
            id="filter-max-price"
            name="maxPrice"
            type="number"
            min={0}
            defaultValue={initial.maxPrice}
            placeholder="Rp"
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <fieldset className="mt-5 border-t border-border pt-5">
        <legend className="text-sm font-semibold text-foreground">Fasilitas</legend>
        {/* Mendatar dan membungkus, bukan kisi vertikal: dua belas kotak
            centang jauh lebih cepat dipindai saat berbaris ke samping. */}
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2.5">
          {FACILITY_FILTERS.map((facility) => (
            <label
              key={facility.slug}
              className="flex items-center gap-2.5 text-sm text-muted-foreground"
            >
              <input
                type="checkbox"
                name="facilities"
                value={facility.slug}
                defaultChecked={initial.facilities.includes(facility.slug)}
                className="h-4 w-4 rounded border-input accent-[var(--primary)]"
              />
              {facility.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="filter-sort" className="text-sm font-semibold text-foreground">
            Urutkan
          </label>
          <select
            id="filter-sort"
            name="sort"
            defaultValue={initial.sort}
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
          >
            Terapkan Filter
          </button>
          <Link
            href="/kos"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Hapus semua filter
          </Link>
        </div>
      </div>
    </form>
  )
}
