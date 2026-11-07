import Link from 'next/link'
import { GraduationCap, Navigation } from 'lucide-react'
import type { CampusPlace } from '@/lib/api'
import { formatJarak, formatNumber } from '@/lib/format'

/**
 * Kampus di Indonesia beserta jumlah kos terverifikasi di sekitarnya.
 *
 * Angka di tiap kampus adalah kos dalam radius tertentu dari kampus itu
 * sendiri — bukan dari lokasi pengunjung. Karena itu kampus tetap punya angka
 * walaupun pengunjung belum mengizinkan akses lokasi.
 *
 * Tautannya menuju pencarian per kota, bukan per kampus: pencarian properti
 * belum bisa disaring berdasarkan kampus, dan menjanjikan sebaliknya akan
 * membuka halaman yang tidak sesuai labelnya.
 */
export function CampusSection({ campuses }: { campuses: CampusPlace[] }) {
  if (campuses.length === 0) {
    return (
      <section id="kampus" aria-labelledby="kampus-title" className="scroll-mt-20">
        <h2 id="kampus-title" className="text-xl font-bold tracking-tight sm:text-2xl">
          Kos sekitar kampus
        </h2>
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          Data kampus belum dapat dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
        </p>
      </section>
    )
  }

  return (
    <section id="kampus" aria-labelledby="kampus-title" className="scroll-mt-20">
      <div className="flex flex-col gap-1.5">
        <h2 id="kampus-title" className="text-xl font-bold tracking-tight sm:text-2xl">
          Kos sekitar kampus
        </h2>
        <p className="text-sm text-muted-foreground">
          Kampus di Indonesia, beserta jumlah kos terverifikasi dalam radius beberapa kilometer.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campuses.map((campus) => (
          <Link
            key={campus.id}
            href={`/kos?city=${encodeURIComponent(campus.city)}`}
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
    </section>
  )
}
