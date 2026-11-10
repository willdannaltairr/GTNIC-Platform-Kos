import Link from 'next/link'
import { GraduationCap, Navigation } from 'lucide-react'
import { JudulSeksi, Seksi } from '@/components/site/kerangka'
import type { CampusPlace } from '@/lib/api'
import { formatJarak, formatNumber } from '@/lib/format'

/**
 * Kampus di Indonesia beserta jumlah kos terverifikasi di sekitarnya.
 *
 * Angka di tiap kampus adalah kos dalam radius tertentu dari kampus itu
 * sendiri, bukan dari lokasi pengunjung. Karena itu kampus tetap punya angka
 * walaupun pengunjung belum mengizinkan akses lokasi.
 *
 * Tautannya menuju halaman kampus itu, yang mengurutkan kos menurut jaraknya
 * dari kampus. Sebelum halaman itu ada, tautannya menuju pencarian per kota;
 * sekarang pencarian per kota tetap disediakan di dalam halamannya.
 */
export function CampusSection({ campuses }: { campuses: CampusPlace[] }) {
  if (campuses.length === 0) {
    return (
      <Seksi id="kampus">
        <JudulSeksi id="kampus-title" eyebrow="Kampus" title="Kos sekitar kampus" />
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          Data kampus belum dapat dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
        </p>
      </Seksi>
    )
  }

  return (
    <Seksi id="kampus">
      <JudulSeksi
        id="kampus-title"
        eyebrow="Kampus"
        title="Kos sekitar kampus"
        description="Kampus di Indonesia, beserta jumlah kos terverifikasi dalam radius beberapa kilometer."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campuses.map((campus) => (
          <Link
            key={campus.id}
            href={`/kampus/${campus.slug}`}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <GraduationCap className="size-4" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {campus.abbreviation ?? campus.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {campus.city}, {campus.province}
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
              <span className="text-[11px] text-muted-foreground">
                {campus.propertyCount > 0
                  ? `${formatNumber(campus.propertyCount)} kos di sekitar`
                  : 'Belum ada kos di sekitar'}
              </span>

              {campus.distanceKm !== null && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
                  <Navigation className="size-3" aria-hidden="true" />
                  {formatJarak(campus.distanceKm)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Seksi>
  )
}
