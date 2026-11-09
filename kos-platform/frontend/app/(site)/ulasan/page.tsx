'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { Bintang } from '@/components/ulasan/bintang'
import { fetchUlasanSaya, type Ulasan } from '@/lib/reviews'
import { formatTanggal } from '@/lib/format'

/**
 * Ulasan milik pembaca sendiri.
 *
 * Penghuni melihat ulasan yang ia tulis beserta keputusan moderasinya, pemilik
 * melihat ulasan yang sudah tayang di propertinya. Penyaringnya di server, jadi
 * halaman ini tidak memilih sumbernya sendiri.
 *
 * Catatan moderasi ditampilkan apa adanya, termasuk yang menolak: ulasan yang
 * hilang tanpa penjelasan membuat penulisnya mengira platform yang salah.
 */
export default function UlasanPage() {
  const { user, status } = useSession()
  const [daftar, setDaftar] = useState<Ulasan[] | null>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchUlasanSaya().then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka ulasan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ulasan terikat ke sewa yang Anda jalani, jadi riwayatnya hanya bisa dibuka setelah masuk.
        </p>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  const penghuni = user.role === 'TENANT'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {penghuni ? 'Ulasan saya' : 'Ulasan properti saya'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {penghuni
              ? 'Penilaian Anda atas kos yang pernah Anda tinggali, beserta keputusan admin atasnya.'
              : 'Penilaian penghuni yang sudah tayang di halaman kos Anda.'}
          </p>
        </div>

        {penghuni && (
          <Link
            href="/ulasan/baru"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
          >
            <PenLine className="size-4" aria-hidden="true" />
            Tulis ulasan
          </Link>
        )}
      </header>

      <div className="mt-6">
        <Panel title="Daftar ulasan" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Ulasan belum bisa dimuat. Periksa koneksi ke layanan API, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.length === 0 ? (
            <EmptyRow>
              {penghuni
                ? 'Belum ada ulasan. Ulasan bisa ditulis setelah sewa Anda berjalan atau selesai, lewat tombol Tulis ulasan.'
                : 'Belum ada penghuni yang menilai kos Anda.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {item.propertySlug ? (
                        <Link
                          href={`/kos/${item.propertySlug}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {item.propertyName ?? 'Kos'}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold">{item.propertyName ?? 'Kos'}</p>
                      )}

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {penghuni ? formatTanggal(item.createdAt) : `${item.tenantName} · ${formatTanggal(item.createdAt)}`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Bintang nilai={item.rating} ukuran="sm" sertakanAngka />
                      {item.status && <StatusBadge status={item.status} jenis="ulasan" />}
                    </div>
                  </div>

                  {item.content && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.content}
                    </p>
                  )}

                  {/* Rincian per aspek hanya ditampilkan kalau ada yang mengisinya. */}
                  {[
                    ['Kebersihan', item.cleanlinessRating],
                    ['Lokasi', item.locationRating],
                    ['Fasilitas', item.facilitiesRating],
                    ['Layanan pemilik', item.ownerServiceRating],
                  ].some(([, nilai]) => nilai != null) && (
                    <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                      {(
                        [
                          ['Kebersihan', item.cleanlinessRating],
                          ['Lokasi', item.locationRating],
                          ['Fasilitas', item.facilitiesRating],
                          ['Layanan pemilik', item.ownerServiceRating],
                        ] as const
                      ).map(([label, nilai]) =>
                        nilai == null ? null : (
                          <div key={label} className="flex items-center justify-between gap-2">
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd>
                              <Bintang nilai={nilai} ukuran="sm" sertakanAngka />
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  )}

                  {item.moderationNotes && (
                    <p className="mt-3 rounded-xl bg-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
                      Catatan admin: {item.moderationNotes}
                    </p>
                  )}

                  {penghuni && item.status !== 'HIDDEN' && (
                    <div className="mt-3">
                      <Link
                        href={`/ulasan/${item.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        Ubah ulasan
                      </Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
