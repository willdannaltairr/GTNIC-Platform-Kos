import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bath, Maximize, Ruler, Users } from 'lucide-react'
import { RoomGallery } from '@/components/kos/room-gallery'
import { RoomBookingActions } from '@/components/kos/room-booking-actions'
import { fetchRoom, fetchRoomsBySlug, type KamarDetail } from '@/lib/rooms'
import { fetchProperty } from '@/lib/api'
import {
  BATHROOM_LABEL,
  ROOM_STATUS_LABEL,
  formatNumber,
  formatRupiah,
} from '@/lib/format'

/**
 * Detail satu kamar di dalam sebuah kos.
 *
 * Alamatnya memuat slug kosnya juga, bukan hanya id kamar, supaya tautan yang
 * dibagikan tetap terbaca dari mana asalnya dan kamar itu tidak pernah tampak
 * seperti berdiri sendiri di luar kosnya. Slug di alamat ikut diperiksa: kamar
 * yang dibuka lewat slug kos yang salah jawabannya 404, bukan halaman yang
 * isinya bertentangan dengan alamatnya.
 *
 * Halaman ini server component, jadi foto dan harganya sudah ada di HTML
 * pertama dan tidak perlu menunggu JavaScript untuk terlihat.
 */

const STATUS_NADA: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  RESERVED: 'bg-amber-50 text-amber-700 ring-amber-200',
  OCCUPIED: 'bg-muted text-muted-foreground ring-border',
  MAINTENANCE: 'bg-amber-50 text-amber-700 ring-amber-200',
  INACTIVE: 'bg-muted text-muted-foreground ring-border',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; roomId: string }>
}): Promise<Metadata> {
  const { roomId } = await params
  const kamar = await fetchRoom(roomId)

  if (!kamar) {
    return { title: 'Kamar tidak ditemukan' }
  }

  return {
    title: `Kamar ${kamar.roomNumber}, ${kamar.propertyName}`,
    description: `Kamar ${kamar.roomNumber} di ${kamar.propertyName}, ${kamar.district}, ${kamar.city}. ${formatRupiah(kamar.monthlyPrice)} per bulan.`,
  }
}

export default async function KamarPublikPage({
  params,
}: {
  params: Promise<{ slug: string; roomId: string }>
}) {
  const { slug, roomId } = await params

  const kamar = await fetchRoom(roomId)

  if (!kamar || kamar.propertySlug !== slug) {
    notFound()
  }

  // Diambil hanya untuk memastikan kosnya memang terbit dan terverifikasi.
  // Kamar milik kos draf bisa saja terbaca lewat id-nya, dan halaman kamar
  // seperti itu tidak boleh jadi jalan samping menuju kos yang belum lolos.
  const properti = await fetchProperty(slug)

  if (!properti) {
    notFound()
  }

  const kamarLain = ((await fetchRoomsBySlug(slug)) ?? []).filter(
    (item) => item.id !== kamar.id && item.availabilityStatus === 'AVAILABLE',
  )

  const luas =
    kamar.areaWidth !== null && kamar.areaLength !== null
      ? `${formatNumber(kamar.areaWidth)} x ${formatNumber(kamar.areaLength)} m`
      : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/kos/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {kamar.propertyName}
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Kamar {kamar.roomNumber}
            {kamar.roomName ? ` · ${kamar.roomName}` : ''}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {kamar.propertyName} · {kamar.district}, {kamar.city}
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            STATUS_NADA[kamar.availabilityStatus] ?? STATUS_NADA.INACTIVE
          }`}
        >
          {ROOM_STATUS_LABEL[kamar.availabilityStatus] ?? kamar.availabilityStatus}
        </span>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <RoomGallery
            photos={kamar.photos.map((foto) => ({
              id: foto.id,
              url: foto.url,
              alt: foto.alt ?? `Kamar ${kamar.roomNumber}`,
            }))}
            judul={`Kamar ${kamar.roomNumber}`}
          />

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold tracking-tight">Tentang kamar ini</h2>

            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Fakta
                ikon={<Ruler className="size-4" aria-hidden="true" />}
                label="Luas"
                nilai={luas ?? 'Belum dicatat pemilik'}
              />
              <Fakta
                ikon={<Bath className="size-4" aria-hidden="true" />}
                label="Kamar mandi"
                nilai={BATHROOM_LABEL[kamar.bathroomType] ?? kamar.bathroomType}
              />
              <Fakta
                ikon={<Users className="size-4" aria-hidden="true" />}
                label="Kapasitas"
                nilai={`Maksimal ${kamar.maximumOccupants} orang`}
              />
              <Fakta
                ikon={<Maximize className="size-4" aria-hidden="true" />}
                label="Lantai"
                nilai={kamar.floorNumber === null ? 'Tidak dicatat' : `Lantai ${kamar.floorNumber}`}
              />
            </dl>

            {kamar.description ? (
              <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                {kamar.description}
              </p>
            ) : (
              <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
                Pemilik belum menuliskan deskripsi kamar ini. Yang tercatat hanya luas, tipe kamar
                mandi, dan kapasitasnya.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold tracking-tight">Fasilitas kamar</h2>

            {kamar.facilities.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Pemilik belum mencatat fasilitas khusus untuk kamar ini. Fasilitas bersama biasanya
                ada di halaman kosnya.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {kamar.facilities.map((fasilitas) => (
                  <li
                    key={fasilitas}
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                  >
                    {fasilitas}
                  </li>
                ))}
              </ul>
            )}

            {properti.facilities.filter((item) => item.category === 'PROPERTY').length > 0 && (
              <>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Fasilitas bersama
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {properti.facilities
                    .filter((item) => item.category === 'PROPERTY')
                    .map((fasilitas) => (
                      <li
                        key={fasilitas.slug}
                        className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                      >
                        {fasilitas.name}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>

          {kamarLain.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold tracking-tight">Kamar lain yang tersedia</h2>
              <ul className="mt-3 divide-y divide-border">
                {kamarLain.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      href={`/kos/${slug}/rooms/${item.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      Kamar {item.roomNumber}
                      {item.roomName ? ` · ${item.roomName}` : ''}
                    </Link>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {formatRupiah(item.monthlyPrice)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Sewa per bulan
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {formatRupiah(kamar.monthlyPrice)}
            </p>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Deposit dan biaya lain ditetapkan pemilik saat pengajuan ditinjau. Rincian lengkapnya
              ada di halaman kos.
            </p>

            <RoomBookingActions
              propertyId={kamar.propertyId}
              propertySlug={slug}
              roomId={kamar.id}
              roomNumber={kamar.roomNumber}
              tersedia={kamar.availabilityStatus === 'AVAILABLE'}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Fakta({
  ikon,
  label,
  nilai,
}: {
  ikon: React.ReactNode
  label: string
  nilai: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
        {ikon}
      </span>
      <div>
        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm">{nilai}</dd>
      </div>
    </div>
  )
}
