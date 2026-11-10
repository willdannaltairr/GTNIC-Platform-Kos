import Link from 'next/link'
import { Building2, MapPin } from 'lucide-react'
import { JudulSeksi, Seksi } from '@/components/site/kerangka'
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
      <Seksi id="area">
        <JudulSeksi id="area-title" eyebrow="Daerah" title="Area kos terpopuler" />
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          Data daerah belum dapat dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
        </p>
      </Seksi>
    )
  }

  return (
    <Seksi id="area">
      <JudulSeksi
        id="area-title"
        eyebrow="Daerah"
        title="Area kos terpopuler"
        description="Daerah dengan kos terverifikasi terbanyak di platform ini."
      />

      {/* Dua kolom di layar lebar, bukan tiga: kartu daerah adalah pintu masuk
          ke pencarian, jadi ukurannya dibuat seperti pilihan utama, bukan
          daftar kecil di pinggir halaman. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
              className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className="flex min-w-0 items-center gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <MapPin className="size-5" aria-hidden="true" />
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-foreground">
                    {region.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {region.type === 'CITY' ? 'Kota' : 'Kecamatan'}
                    {region.city && region.city !== region.name ? ` · ${region.city}` : ''}
                  </span>
                </span>
              </span>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Building2 className="size-3.5" aria-hidden="true" />
                {formatNumber(region.propertyCount)}
              </span>
            </Link>
          )
        })}
      </div>
    </Seksi>
  )
}
