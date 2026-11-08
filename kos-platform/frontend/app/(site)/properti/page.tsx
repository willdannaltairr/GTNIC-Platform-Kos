'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchMyProperties,
  submitPropertyForReview,
  setPropertyPublication,
  type PropertiKelola,
} from '@/lib/my-properties'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Daftar properti milik pemilik yang sedang masuk.
 *
 * Memuat properti draf dan yang belum lolos verifikasi, bukan hanya yang sudah
 * terbit. Halaman ini tempat pemilik menyelesaikan pekerjaannya, dan properti
 * yang belum terbit justru yang paling perlu ditindaklanjuti.
 *
 * Dua tombol tiap baris mengikuti keadaan propertinya: properti yang belum
 * diajukan bisa diajukan, yang sudah terverifikasi bisa diterbitkan. Tombol
 * yang tidak mungkin dipakai tidak ditampilkan sama sekali, karena tombol mati
 * hanya meninggalkan pertanyaan "kenapa tidak bisa".
 */
export default function PropertiSayaPage() {
  const { user, status } = useSession()
  const [daftar, setDaftar] = useState<PropertiKelola[] | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const muat = async (): Promise<void> => {
    setDaftar(await fetchMyProperties())
  }

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchMyProperties().then((hasil) => {
      if (!aktif) return
      setDaftar(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const jalankan = async (id: string, aksi: () => Promise<unknown>): Promise<void> => {
    setSibuk(id)
    setPesan(null)

    try {
      await aksi()
      await muat()
    } catch (error) {
      // Pesan server menyebut sebabnya (mis. properti belum terverifikasi),
      // dan itu yang perlu dibaca pemiliknya.
      setPesan(error instanceof Error ? error.message : 'Aksi tidak berhasil')
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk mengelola properti</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Properti terikat ke akun pemiliknya, jadi daftarnya hanya bisa dibuka setelah masuk.
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

  const bolehKelola = user.role === 'OWNER' || user.role === 'ADMIN'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Properti saya</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Daftarkan kos, lengkapi isinya, lalu ajukan untuk ditinjau admin.
          </p>
        </div>

        {bolehKelola && (
          <Link
            href="/properti/baru"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
          >
            <Plus className="size-4" aria-hidden="true" />
            Tambah properti
          </Link>
        )}
      </header>

      {!bolehKelola && (
        <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Akun Anda terdaftar sebagai pencari kos. Pengelolaan properti tersedia untuk akun pemilik.
        </p>
      )}

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      {bolehKelola && (
        <div className="mt-6">
          <Panel title="Daftar properti" description="Terbaru lebih dulu.">
            {daftar === null ? (
              <EmptyRow>
                Properti belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
              </EmptyRow>
            ) : daftar.length === 0 ? (
              <EmptyRow>
                Belum ada properti. Tekan Tambah properti untuk mendaftarkan kos pertama Anda.
              </EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {daftar.map((item) => (
                  <li key={item.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/properti/${item.id}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.district}, {item.city} · {item.availableRooms} dari{' '}
                          {item.totalRooms} kamar tersedia
                          {item.minMonthlyPrice !== null
                            ? ` · mulai ${formatRupiah(item.minMonthlyPrice)}`
                            : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.verificationStatus} jenis="verifikasi" />
                        <StatusBadge status={item.publicationStatus} jenis="publikasi" />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Aksi href={`/properti/${item.id}`}>Kelola</Aksi>

                      {item.verificationStatus === 'PENDING' || item.verificationStatus === 'REJECTED' ? (
                        <Tombol
                          onClick={() => jalankan(item.id, () => submitPropertyForReview(item.id))}
                          sibuk={sibuk === item.id}
                          utama
                        >
                          Ajukan verifikasi
                        </Tombol>
                      ) : null}

                      {item.verificationStatus === 'VERIFIED' &&
                        item.publicationStatus !== 'PUBLISHED' && (
                          <Tombol
                            onClick={() =>
                              jalankan(item.id, () => setPropertyPublication(item.id, 'PUBLISHED'))
                            }
                            sibuk={sibuk === item.id}
                            utama
                          >
                            Terbitkan
                          </Tombol>
                        )}

                      {item.publicationStatus === 'PUBLISHED' && (
                        <Tombol
                          onClick={() =>
                            jalankan(item.id, () => setPropertyPublication(item.id, 'UNPUBLISHED'))
                          }
                          sibuk={sibuk === item.id}
                        >
                          Tarik dari daftar
                        </Tombol>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}

function Aksi({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  )
}

function Tombol({
  children,
  onClick,
  sibuk,
  utama = false,
}: {
  children: React.ReactNode
  onClick: () => void
  sibuk: boolean
  utama?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sibuk}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-60',
        utama
          ? 'bg-primary text-primary-foreground hover:bg-primary-strong'
          : 'border border-border hover:bg-muted',
      )}
    >
      {sibuk && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
