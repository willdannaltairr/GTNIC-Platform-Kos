import Link from 'next/link'
import { Building2, MapPin } from 'lucide-react'
import type { RegionPlace } from '@/lib/api'
import { formatNumber } from '@/lib/format'

/**
 * Area dengan kos terbanyak.
 *
 * Urutannya sudah ditentukan database (jumlah kos terbanyak lebih dulu), jadi
 * komponen ini tidak mengurutkan ulang, angka yang tampil dan urutannya
 * berasal dari sumber yang sama.
 *
 * Kotak daerah dibedakan dari kecamatan karena keduanya disaring dengan kolom
 * yang berbeda di halaman pencarian: kota ke `city`, kecamatan ke `district`.
 * Menautkannya ke kolom yang salah akan membuka halaman yang kosong.
 */
export function PopularAreasSection({ regions }: { regions: RegionPlace[] }) {
  if (regions.length === 0) {
    return (
      <section aria-labelledby="area-title">
        <h2 id="area-title" className="text-xl font-bold tracking-tight sm:text-2xl">
          Area kos terpopuler
        </h2>
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          Data daerah belum dapat dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="area-title">
      <div className="flex flex-col gap-1.5">
        <h2 id="area-title" className="text-xl font-bold tracking-tight sm:text-2xl">
          Area kos terpopuler
        </h2>
        <p className="text-sm text-muted-foreground">
          Daerah dengan kos terverifikasi terbanyak di platform ini.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {regions.map((region) => {
          // Kotak kota dan kecamatan disaring lewat parameter yang berbeda.
          const href =
            region.type === 'CITY'
              ? `/kos?city=${encodeURIComponent(region.name)}`
              : `/kos?district=${encodeURIComponent(region.name)}`

          return (
            <Link
              key={region.id}
              href={href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <MapPin className="size-4" aria-hidden="true" />
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {region.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {region.type === 'CITY' ? 'Kota' : 'Kecamatan'}
                    {region.city && region.city !== region.name ? ` · ${region.city}` : ''}
                  </span>
                </span>
              </span>

              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Building2 className="size-3" aria-hidden="true" />
                {formatNumber(region.propertyCount)}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
