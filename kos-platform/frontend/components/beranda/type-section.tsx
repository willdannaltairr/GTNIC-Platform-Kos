import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PropertyCard } from '@/components/property-card'
import { fetchProperties } from '@/lib/api'

/**
 * Satu baris rekomendasi untuk satu tipe kos.
 *
 * Dipakai dua kali di beranda — kos putra dan kos putri — dengan penyaring
 * tipe yang berbeda. Dibuat satu komponen supaya keduanya tidak pernah
 * berbeda perilaku hanya karena ditulis dua kali.
 *
 * Bila API tidak dapat dihubungi, bagian ini menyebutkan keadaannya alih-alih
 * menyembunyikan diri: bagian yang hilang tanpa penjelasan membuat pengunjung
 * mengira platformnya memang tidak punya kos tipe itu.
 */
export async function TypeSection({
  type,
  title,
  description,
  href,
}: {
  type: 'KOS_PUTRA' | 'KOS_PUTRI'
  title: string
  description: string
  href: string
}) {
  const hasil = await fetchProperties({ type, sort: 'newest', limit: 3 })

  return (
    <section aria-labelledby={`tipe-${type}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id={`tipe-${type}`} className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>

        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-strong"
        >
          Lihat semua
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {hasil && hasil.items.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {hasil.items.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          {hasil === null
            ? 'Daftar kos belum dapat dimuat. Pastikan server API berjalan, lalu muat ulang halaman.'
            : `Belum ada ${title.toLowerCase()} terverifikasi yang dipublikasikan.`}
        </p>
      )}
    </section>
  )
}
