import Image from 'next/image'
import Link from 'next/link'
import { BedDouble, MapPin, Navigation, Users } from 'lucide-react'
import type { PropertyListItem } from '@/lib/api'
import {
  COST_CONFIDENCE_CLASS,
  COST_CONFIDENCE_LABEL,
  PROPERTY_TYPE_LABEL,
  formatJarak,
  formatLastConfirmed,
  formatRupiah,
} from '@/lib/format'

/**
 * Kartu properti untuk daftar pencarian dan rekomendasi di beranda.
 * Semua angka berasal dari API, tidak ada nilai yang di-hardcode.
 *
 * `gated` dipakai oleh rekomendasi di landing page: di sana kartu belum boleh
 * membuka detail properti, karena pengunjung belum tentu punya akun. Kartu di
 * halaman /kos tidak memakai ini, di sana pengunjung memang sudah masuk.
 *
 * Jarak hanya muncul bila API mengirimkannya, yaitu ketika pencarian menyertakan
 * titik koordinat. Di halaman /kos tanpa koordinat, kartunya sama seperti dulu.
 */
export function PropertyCard({
  property,
  gated = false,
  jarakDari = 'lokasi Anda',
}: {
  property: PropertyListItem
  gated?: boolean
  /** Sebutan titik yang jadi acuan `distanceKm`, mis. "tujuan" atau "kampus". */
  jarakDari?: string
}) {
  const available = property.availableRooms
  const total = property.totalRooms
  const bathroom =
    property.bathroomTypes.length === 1
      ? property.bathroomTypes[0] === 'private'
        ? 'KM dalam'
        : 'KM luar'
      : property.bathroomTypes.length > 1
        ? 'KM dalam & luar'
        : 'KM belum diisi'

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <Link
        href={gated ? '/masuk' : `/kos/${property.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
      >
        {property.imageUrl ? (
          <Image
            src={property.imageUrl}
            alt={property.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full place-items-center text-sm text-muted-foreground">
            Foto belum tersedia
          </span>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-medium text-foreground ring-1 ring-border">
          {PROPERTY_TYPE_LABEL[property.propertyType] ?? property.propertyType}
        </span>

        {property.distanceKm !== null && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/95 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            <Navigation className="size-3 shrink-0" aria-hidden="true" />
            {formatJarak(property.distanceKm)}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight">{property.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-1">
              {property.district}, {property.city}
            </span>
          </p>
        </div>

        {property.distanceKm !== null && (
          <p className="text-xs font-medium text-primary">
            {formatJarak(property.distanceKm)} dari {jarakDari}
            {property.distanceFromOriginKm !== null && (
              <span className="font-normal text-muted-foreground">
                {' '}
                · {formatJarak(property.distanceFromOriginKm)} dari titik asal
              </span>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            <BedDouble className="h-3 w-3" aria-hidden />
            {bathroom}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" aria-hidden />
            {available} dari {total} kamar tersedia
          </span>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {property.facilities.slice(0, 3).join(' · ') || 'Fasilitas belum diisi'}
          {property.facilities.length > 3 ? ` · +${property.facilities.length - 3} lagi` : ''}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3">
          <div>
            <p className="text-sm font-bold text-foreground">
              {formatRupiah(property.minMonthlyPrice)}
              <span className="text-xs font-normal text-muted-foreground"> /bulan</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{formatLastConfirmed(property.availabilityConfirmedDaysAgo)}</p>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-medium ring-1 ${
              COST_CONFIDENCE_CLASS[property.costConfidence] ?? 'bg-muted text-muted-foreground ring-border'
            }`}
          >
            {COST_CONFIDENCE_LABEL[property.costConfidence] ?? property.costConfidence}
          </span>
        </div>

        {property.isAvailabilityStale && (
          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-700 ring-1 ring-amber-200">
            Ketersediaan perlu dikonfirmasi ulang ke pemilik.
          </p>
        )}
      </div>
    </article>
  )
}
