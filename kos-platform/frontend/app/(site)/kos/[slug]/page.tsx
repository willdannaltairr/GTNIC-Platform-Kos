import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { AlertTriangle, CheckCircle2, MapPin, ShieldCheck, UserRound } from 'lucide-react'
import { BookingPanel } from '@/components/kos/booking-panel'
import { HubungiPemilik } from '@/components/kos/hubungi-pemilik'
import { fetchProperty } from '@/lib/api'
import {
  BATHROOM_LABEL,
  COST_CONFIDENCE_CLASS,
  COST_CONFIDENCE_LABEL,
  PROPERTY_TYPE_LABEL,
  ROOM_STATUS_LABEL,
  formatLastConfirmed,
  formatNumber,
  formatRupiah,
} from '@/lib/format'

const STATUS_CLASS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  RESERVED: 'bg-amber-50 text-amber-700 ring-amber-200',
  OCCUPIED: 'bg-slate-100 text-slate-600 ring-slate-200',
  MAINTENANCE: 'bg-rose-50 text-rose-700 ring-rose-200',
  INACTIVE: 'bg-slate-100 text-slate-500 ring-slate-200',
}

// cache() mendedupe pemanggilan API dalam satu request, sehingga
// generateMetadata dan komponen halaman hanya menembak API sekali.
const getProperty = cache(async (slug: string) => fetchProperty(slug))

/**
 * notFound() dipanggil di sini juga, bukan hanya di komponen halaman.
 *
 * generateMetadata dievaluasi sebelum shell dirender, jadi status HTTP tetap
 * 404 meskipun suatu saat ada Suspense boundary (loading.tsx) di segmen induk.
 * Tanpa ini, kos yang tidak ada bisa tampil sebagai soft-404: konten 404
 * dengan status 200.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const property = await getProperty(slug)

  if (!property) notFound()

  return {
    title: property.name,
    description:
      property.description?.slice(0, 150) ??
      `Detail kos ${property.name} di ${property.district}, ${property.city}.`,
  }
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const property = await getProperty(slug)

  if (!property) notFound()

  const summary = property.costSummary
  const [primaryImage, ...restImages] = property.images

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="text-xs text-muted-foreground">
        <Link href="/kos" className="hover:text-foreground">
          Cari Kos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{property.name}</span>
      </nav>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{property.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            {property.address}, {property.district}, {property.city}, {property.province}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-background px-3 py-1.5 text-xs font-medium ring-1 ring-border">
            {PROPERTY_TYPE_LABEL[property.propertyType] ?? property.propertyType}
          </span>
          {property.verificationStatus === 'VERIFIED' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Terverifikasi admin
            </span>
          )}
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          {/* Galeri */}
          <div>
            {primaryImage?.url ? (
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="grid aspect-[16/10] place-items-center rounded-2xl bg-muted text-sm text-muted-foreground">
                Foto belum tersedia
              </div>
            )}

            {restImages.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {restImages.map((image) =>
                  image.url ? (
                    <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                      <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>

          {/* Deskripsi */}
          {property.description && (
            <section>
              <h2 className="text-lg font-bold tracking-tight">Tentang kos ini</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {property.description}
              </p>
            </section>
          )}

          {/* Fasilitas */}
          <section>
            <h2 className="text-lg font-bold tracking-tight">Fasilitas</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {property.facilities.length > 0 ? (
                property.facilities.map((facility) => (
                  <span
                    key={facility.slug}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    {facility.name}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Pemilik belum mencantumkan fasilitas.</p>
              )}
            </div>
          </section>

          {/* Kamar */}
          <section>
            <h2 className="text-lg font-bold tracking-tight">
              Kamar ({formatNumber(property.rooms.length)})
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Kamar</th>
                    <th className="px-4 py-3 font-semibold">Harga</th>
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">Kamar mandi</th>
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">Luas</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {property.rooms.map((room) => (
                    <tr key={room.id} className="bg-card">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">{room.roomNumber}</span>
                        <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                          {room.roomName ?? room.roomType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatRupiah(room.monthlyPrice)}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {BATHROOM_LABEL[room.bathroomType] ?? room.bathroomType}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {room.areaWidth && room.areaLength
                          ? `${room.areaWidth}×${room.areaLength} m²`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${
                            STATUS_CLASS[room.availabilityStatus] ?? 'bg-muted ring-border'
                          }`}
                        >
                          {ROOM_STATUS_LABEL[room.availabilityStatus] ?? room.availabilityStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Aturan */}
          {property.rules.length > 0 && (
            <section>
              <h2 className="text-lg font-bold tracking-tight">Aturan kos</h2>
              <ul className="mt-3 space-y-3">
                {property.rules.map((rule) => (
                  <li key={rule.id} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">
                      {rule.title}
                      {rule.isMandatory && (
                        <span className="ml-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-200">
                          Wajib
                        </span>
                      )}
                    </p>
                    {rule.description && (
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {rule.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Kolom kanan: biaya, ketersediaan, pemilik */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* Pengajuan ditaruh paling atas: pengunjung memutuskan setelah
              membaca rincian biaya, dan panel yang terkubur di bawah pemilik
              hampir tidak pernah ditemukan. */}
          <BookingPanel
            propertyId={property.id}
            rooms={property.rooms
              .filter((room) => room.availabilityStatus === 'AVAILABLE')
              .map((room) => ({
                id: room.id,
                roomNumber: room.roomNumber,
                monthlyPrice: room.monthlyPrice,
              }))}
          />

          {/* Simulasi biaya */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold tracking-tight">Simulasi Biaya</h2>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-medium ring-1 ${
                  COST_CONFIDENCE_CLASS[summary.confidence] ?? 'bg-muted ring-border'
                }`}
              >
                {COST_CONFIDENCE_LABEL[summary.confidence] ?? summary.confidence}
              </span>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Sewa terendah / bulan</dt>
                <dd className="font-semibold">{formatRupiah(summary.monthlyRent)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Biaya tetap bulanan</dt>
                <dd className="font-semibold">{formatRupiah(summary.monthlyFixed)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Biaya variabel (estimasi)</dt>
                <dd className="font-semibold">± {formatRupiah(summary.monthlyEstimated)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <dt className="font-semibold text-foreground">Perkiraan per bulan</dt>
                <dd className="font-bold text-primary">
                  ± {formatRupiah(summary.monthlyTotalEstimated)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl bg-muted p-3.5">
              <p className="text-xs font-semibold text-foreground">Biaya awal masuk</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                ± {formatRupiah(summary.upfrontTotal)}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Sewa bulan pertama {formatRupiah(summary.monthlyRent)} + deposit{' '}
                {formatRupiah(summary.depositAmount)}
                {summary.oneTimeOther > 0 && ` + biaya lain ${formatRupiah(summary.oneTimeOther)}`}.
                Deposit bukan biaya bulanan dan dikembalikan sesuai kesepakatan.
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-foreground">Estimasi biaya sampai</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {summary.projections.map((projection) => (
                  <li key={projection.months} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{projection.months} bulan</span>
                    <span className="font-semibold">± {formatRupiah(projection.total)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {summary.unknowns.length > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Perlu dikonfirmasi ke pemilik: {summary.unknowns.join(', ')}. Angka di atas
                  adalah estimasi, bukan tagihan pasti. Tanyakan langsung saat survei.
                </span>
              </p>
            )}
          </div>

          {/* Ketersediaan */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold tracking-tight">Ketersediaan</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatLastConfirmed(property.availabilityConfirmedDaysAgo)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {property.rooms.filter((room) => room.availabilityStatus === 'AVAILABLE').length} dari{' '}
              {property.rooms.length} kamar berstatus tersedia
            </p>

            {property.isAvailabilityStale && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
                Informasi ketersediaan ini sudah lama tidak diperbarui, jadi statusnya belum bisa
                dianggap pasti. Konfirmasi dulu ke pemilik sebelum memesan.
              </p>
            )}
          </div>

          {/* Pemilik */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold tracking-tight">Pemilik</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {property.owner.businessName ?? property.owner.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {property.owner.verified ? 'Identitas terverifikasi' : 'Verifikasi identitas dalam proses'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Kontak pemilik ditampilkan setelah Anda masuk dan mengajukan permintaan sewa, agar
              data pribadi tidak tersebar bebas.
            </p>

            <HubungiPemilik
              propertyId={property.id}
              namaPemilik={property.owner.businessName ?? property.owner.name}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
