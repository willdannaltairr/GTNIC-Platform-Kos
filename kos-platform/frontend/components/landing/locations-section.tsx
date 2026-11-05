import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { LOCATIONS } from '@/lib/constants'

/** Lokasi populer: kota dan kawasan yang paling sering dicari. */
export function LocationsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Lokasi Populer</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Pilih kawasan yang dekat dengan kampus atau tempat kerja Anda. Setiap pilihan langsung
          membuka hasil pencarian sesuai kotanya.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LOCATIONS.map((location) => (
          <Link
            key={location.city}
            href={location.href}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-leaf-soft text-primary">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{location.city}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{location.area}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
