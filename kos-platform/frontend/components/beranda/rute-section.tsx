'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, Navigation } from 'lucide-react'
import { PropertyCard } from '@/components/property-card'
import { fetchProperties, type CampusPlace, type PropertyListItem, type RegionPlace } from '@/lib/api'

/** Radius di sekitar tujuan. Sepuluh km kira-kira sejauh perjalanan yang masih masuk akal ditempuh harian. */
const RADIUS_TUJUAN_KM = 10

interface Titik {
  label: string
  lat: number
  lng: number
}

type Hasil =
  | { tahap: 'diam' }
  | { tahap: 'memuat' }
  | { tahap: 'siap'; kos: PropertyListItem[]; total: number; asal: string; tujuan: string }
  | { tahap: 'kosong'; asal: string; tujuan: string }
  | { tahap: 'gagal'; pesan: string }

/**
 * Daftar titik yang bisa dipilih, digabung dari kampus dan daerah.
 *
 * Hanya titik yang punya koordinat yang ikut — tanpa koordinat, jaraknya tidak
 * bisa dihitung dan pilihannya hanya akan menghasilkan hasil kosong tanpa
 * penjelasan.
 */
const titikDari = (campuses: CampusPlace[], regions: RegionPlace[]): Titik[] => {
  const dariKampus: Titik[] = campuses
    .filter((campus) => campus.latitude !== null && campus.longitude !== null)
    .map((campus) => ({
      label: `${campus.abbreviation ?? campus.name} — ${campus.city}`,
      lat: campus.latitude as number,
      lng: campus.longitude as number,
    }))

  const dariDaerah: Titik[] = regions
    .filter((region) => region.latitude !== null && region.longitude !== null)
    .map((region) => ({
      label: region.name,
      lat: region.latitude as number,
      lng: region.longitude as number,
    }))

  return [...dariKampus, ...dariDaerah]
}

/**
 * Filter "dari lokasi mana ke lokasi mana".
 *
 * Asal dan tujuan dipisah karena keduanya menjawab pertanyaan berbeda: yang
 * dicari adalah kos di dekat TUJUAN (kampus atau kantor), sedangkan jarak dari
 * ASAL dipakai untuk menimbang seberapa jauh perpindahannya. Menggabungkan
 * keduanya menjadi satu titik akan menghilangkan salah satu jawabannya.
 *
 * Asal boleh berupa lokasi perangkat saat ini; kalau pengunjung belum pindah,
 * titik itulah yang paling dekat dengan kenyataannya.
 */
export function RuteSection({
  campuses,
  regions,
}: {
  campuses: CampusPlace[]
  regions: RegionPlace[]
}) {
  const titik = titikDari(campuses, regions)

  const [asalKey, setAsalKey] = useState('gps')
  const [tujuanIndex, setTujuanIndex] = useState(titik.length > 0 ? '0' : '')
  const [hasil, setHasil] = useState<Hasil>({ tahap: 'diam' })

  const tujuanTerpilih = tujuanIndex === '' ? null : titik[Number(tujuanIndex)] ?? null

  /** Titik asal: GPS bila dipilih, selain itu dari daftar daerah/kampus. */
  const ambilAsal = (): Promise<{ titik: Titik } | { galat: string }> =>
    new Promise((resolve) => {
      if (asalKey !== 'gps') {
        const dipilih = titik[Number(asalKey)]
        return resolve(dipilih ? { titik: dipilih } : { galat: 'Titik asal tidak dikenali.' })
      }

      if (!('geolocation' in navigator)) {
        return resolve({ galat: 'Peramban ini tidak mendukung penentuan lokasi.' })
      }

      navigator.geolocation.getCurrentPosition(
        (posisi) =>
          resolve({
            titik: {
              label: 'lokasi Anda saat ini',
              lat: posisi.coords.latitude,
              lng: posisi.coords.longitude,
            },
          }),
        () =>
          resolve({
            galat:
              'Lokasi perangkat tidak bisa dibaca. Pilih titik asal dari daftar, atau izinkan akses lokasi lebih dulu.',
          }),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      )
    })

  const cari = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!tujuanTerpilih) {
      setHasil({ tahap: 'gagal', pesan: 'Pilih lokasi tujuan lebih dulu.' })
      return
    }

    setHasil({ tahap: 'memuat' })

    const asal = await ambilAsal()
    if ('galat' in asal) {
      setHasil({ tahap: 'gagal', pesan: asal.galat })
      return
    }

    // Kos dicari di sekitar TUJUAN, lalu diurutkan dari yang paling dekat
    // dengan tujuan itu. Titik asal dikirim terpisah supaya tiap kartu juga
    // bisa menyebut jaraknya dari sana.
    const data = await fetchProperties({
      nearLat: tujuanTerpilih.lat,
      nearLng: tujuanTerpilih.lng,
      maxDistanceKm: RADIUS_TUJUAN_KM,
      originLat: asal.titik.lat,
      originLng: asal.titik.lng,
      sort: 'distance',
      limit: 6,
    })

    if (data === null) {
      setHasil({
        tahap: 'gagal',
        pesan: 'Daftar kos belum dapat dimuat. Pastikan server API berjalan, lalu coba lagi.',
      })
      return
    }

    const bersama = { asal: asal.titik.label, tujuan: tujuanTerpilih.label }

    setHasil(
      data.items.length === 0
        ? { tahap: 'kosong', ...bersama }
        : { tahap: 'siap', kos: data.items, total: data.meta.total, ...bersama },
    )
  }

  const memuat = hasil.tahap === 'memuat'

  return (
    <section id="rute" aria-labelledby="rute-title" className="scroll-mt-20">
      <h2 id="rute-title" className="text-xl font-bold tracking-tight sm:text-2xl">
        Dari lokasi mana ke lokasi mana
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
        Pilih titik asal dan tujuan — misalnya dari rumah Anda sekarang ke kampus tujuan. Kos yang
        tampil adalah yang berada dalam radius {RADIUS_TUJUAN_KM} km dari tujuan, dan tiap kartu
        menyebut jaraknya dari kedua titik.
      </p>

      <form
        onSubmit={cari}
        className="mt-5 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-end"
      >
        <div>
          <label htmlFor="rute-asal" className="text-sm font-semibold text-foreground">
            Dari
          </label>
          <select
            id="rute-asal"
            value={asalKey}
            onChange={(event) => setAsalKey(event.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none"
          >
            <option value="gps">Lokasi saya saat ini (GPS)</option>
            {titik.map((item, index) => (
              <option key={`asal-${item.label}-${index}`} value={String(index)}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight
          className="hidden size-5 shrink-0 text-muted-foreground lg:mb-3 lg:block"
          aria-hidden="true"
        />

        <div>
          <label htmlFor="rute-tujuan" className="text-sm font-semibold text-foreground">
            Ke
          </label>
          <select
            id="rute-tujuan"
            value={tujuanIndex}
            onChange={(event) => setTujuanIndex(event.target.value)}
            disabled={titik.length === 0}
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none disabled:opacity-60"
          >
            {titik.length === 0 && <option value="">Belum ada titik tujuan</option>}
            {titik.map((item, index) => (
              <option key={`tujuan-${item.label}-${index}`} value={String(index)}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={memuat || !tujuanTerpilih}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70 lg:mb-0"
        >
          {memuat ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Navigation className="size-4" aria-hidden="true" />
          )}
          {memuat ? 'Menghitung…' : 'Cari kos di tujuan'}
        </button>
      </form>

      {hasil.tahap === 'gagal' && (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
          {hasil.pesan}
        </p>
      )}

      {hasil.tahap === 'kosong' && (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
          Belum ada kos dalam radius {RADIUS_TUJUAN_KM} km dari{' '}
          <span className="font-medium text-foreground">{hasil.tujuan}</span>. Data properti di
          platform ini masih terbatas pada beberapa kota.
        </p>
      )}

      {hasil.tahap === 'siap' && (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Dari <span className="font-medium text-foreground">{hasil.asal}</span> ke{' '}
            <span className="font-medium text-foreground">{hasil.tujuan}</span> —{' '}
            {hasil.total} kos dalam radius {RADIUS_TUJUAN_KM} km dari tujuan.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {hasil.kos.map((kos) => (
              <PropertyCard key={kos.id} property={kos} jarakDari="tujuan" />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
