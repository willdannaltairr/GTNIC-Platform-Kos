'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, LocateFixed, MapPin, ShieldAlert } from 'lucide-react'
import { PropertyCard } from '@/components/property-card'
import { fetchProperties, type PropertyListItem } from '@/lib/api'

/** Radius bawaan rekomendasi "sekitar saya". */
const RADIUS_KM = 15

type Keadaan =
  | { tahap: 'diam' }
  | { tahap: 'meminta' }
  | { tahap: 'memuat'; jarak: number }
  | { tahap: 'siap'; kos: PropertyListItem[]; total: number }
  | { tahap: 'kosong' }
  | { tahap: 'gagal'; pesan: string }
  | { tahap: 'ditolak' }

/**
 * Pesan galat dari Geolocation API.
 *
 * Kode 1 (ditolak) dipisahkan dari kode 2 dan 3 karena hanya yang pertama butuh
 * tindakan pengunjung, membuka setelan izin situs. Dua sisanya soal sinyal dan
 * biasanya berhasil kalau dicoba lagi di tempat lain; menyuruh orang membuka
 * setelan untuk keduanya hanya membuang waktunya.
 */
const pesanGalat = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) return 'ditolak'
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Lokasi perangkat tidak tersedia. Coba lagi di tempat dengan sinyal GPS lebih baik.'
  }
  return 'Pencarian lokasi memakan waktu terlalu lama. Coba lagi sebentar lagi.'
}

/**
 * Rekomendasi kos terdekat berdasarkan lokasi perangkat.
 *
 * Izin lokasi tidak pernah diminta otomatis saat halaman dibuka: peramban
 * menampilkan kotak izin begitu saja, dan pengunjung yang belum tahu halaman
 * ini butuh apa cenderung menolaknya, penolakan itu lalu menempel untuk
 * seluruh situs. Tombolnya dulu yang ditekan, baru izinnya diminta.
 *
 * Pengecualiannya bila izin sudah pernah diberikan: di situ lokasinya langsung
 * dipakai, karena tidak ada lagi kotak yang muncul dan menunggu klik hanya
 * menambah satu langkah tanpa alasan.
 */
export function NearbySection() {
  const [keadaan, setKeadaan] = useState<Keadaan>({ tahap: 'diam' })

  const cari = useCallback((jarak: number): Promise<void> => {
    setKeadaan({ tahap: 'memuat', jarak })

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (posisi) => {
          const { latitude, longitude } = posisi.coords
          const hasil = await fetchProperties({
            nearLat: latitude,
            nearLng: longitude,
            maxDistanceKm: jarak,
            sort: 'distance',
            limit: 6,
          })

          if (hasil === null) {
            setKeadaan({
              tahap: 'gagal',
              pesan: 'Daftar kos belum dapat dimuat. Pastikan server API berjalan, lalu coba lagi.',
            })
            return resolve()
          }

          setKeadaan(
            hasil.items.length === 0
              ? { tahap: 'kosong' }
              : { tahap: 'siap', kos: hasil.items, total: hasil.meta.total },
          )
          resolve()
        },
        (error) => {
          const pesan = pesanGalat(error)
          setKeadaan(pesan === 'ditolak' ? { tahap: 'ditolak' } : { tahap: 'gagal', pesan })
          resolve()
        },
        // Akurasi tinggi tidak diminta: untuk mencari kos dalam radius
        // kilometer, perkiraan dari jaringan sudah memadai, dan GPS presisi
        // tinggi membuat pengunjung menunggu lebih lama di dalam ruangan.
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      )
    })
  }, [])

  useEffect(() => {
    if (!('permissions' in navigator)) return

    let dibatalkan = false

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!dibatalkan && status.state === 'granted') void cari(RADIUS_KM)
      })
      .catch(() => {
        // Peramban ini tidak bisa menjawab status izin; biarkan tombolnya.
      })

    return () => {
      dibatalkan = true
    }
  }, [cari])

  const memuat = keadaan.tahap === 'memuat' || keadaan.tahap === 'meminta'

  return (
    <section id="sekitar-saya" aria-labelledby="sekitar-saya-title" className="scroll-mt-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="sekitar-saya-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            Sekitar Anda
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Kos terdekat dari lokasi perangkat, diurutkan dari yang paling dekat dalam radius{' '}
            {RADIUS_KM} km.
          </p>
        </div>

        {keadaan.tahap !== 'siap' && (
          <button
            type="button"
            onClick={() => void cari(RADIUS_KM)}
            disabled={memuat}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
          >
            {memuat ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="size-4" aria-hidden="true" />
            )}
            {memuat ? 'Mencari lokasi…' : 'Gunakan lokasi saya'}
          </button>
        )}
      </div>

      {keadaan.tahap === 'diam' && (
        <p className="mt-5 rounded-2xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          Tekan <span className="font-medium text-foreground">Gunakan lokasi saya</span> dan
          peramban akan meminta izin lokasi. Izin ini dipakai sekali untuk menghitung jarak ke
          tiap kos, posisinya tidak disimpan di server maupun dibagikan ke pemilik kos.
        </p>
      )}

      {keadaan.tahap === 'ditolak' && (
        <div className="mt-5 flex gap-3 rounded-2xl border border-border bg-card p-6">
          <ShieldAlert className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Izin lokasi ditolak.</p>
            <p className="mt-1">
              Peramban memblokir permintaan lokasi untuk situs ini, jadi permintaan berikutnya
              tidak akan memunculkan kotak izin lagi. Untuk mengaktifkannya, buka setelan situs di
              ikon gembok pada bilah alamat, izinkan akses lokasi, lalu muat ulang halaman.
            </p>
            <p className="mt-2">
              Tanpa lokasi, Anda masih bisa mencari lewat{' '}
              <Link href="/kos" className="font-medium text-primary hover:text-primary-strong">
                halaman Cari Kos
              </Link>{' '}
             , kota dan kecamatan bisa diisi manual.
            </p>
          </div>
        </div>
      )}

      {keadaan.tahap === 'gagal' && (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Lokasi belum bisa dipakai.</p>
          <p className="mt-1">{keadaan.pesan}</p>
        </div>
      )}

      {keadaan.tahap === 'kosong' && (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-6 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">
            Belum ada kos dalam radius {RADIUS_KM} km dari lokasi Anda.
          </p>
          <p className="mt-1">
            Data properti di platform ini masih terbatas pada beberapa kota, jadi kota Anda mungkin
            belum tercakup. Coba lihat{' '}
            <Link href="/kos" className="font-medium text-primary hover:text-primary-strong">
              seluruh kos yang tersedia
            </Link>
            .
          </p>
        </div>
      )}

      {keadaan.tahap === 'siap' && (
        <>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {keadaan.kos.map((kos) => (
              <PropertyCard key={kos.id} property={kos} />
            ))}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {keadaan.total} kos dalam radius {RADIUS_KM} km, diurutkan dari yang terdekat.
          </p>
        </>
      )}
    </section>
  )
}
