'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel } from '@/components/dashboard/kit'
import { fetchPercakapanList, type Percakapan, type DaftarPercakapan } from '@/lib/conversations'
import { formatTanggalJam } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Kotak masuk percakapan.
 *
 * Penghuni melihat percakapan yang ia mulai, pemilik melihat yang tertuju
 * padanya, admin melihat semuanya. Penyaringnya di server, jadi halaman ini
 * tidak memilih sumbernya sendiri.
 *
 * Percakapan yang belum punya pesan tidak ikut tampil: yang dibuka lalu
 * ditinggalkan tanpa sepatah kata bukan percakapan, dan menampilkannya membuat
 * kotak masuk penuh baris kosong.
 */
export default function PesanPage() {
  const { user, status } = useSession()
  const [daftar, setDaftar] = useState<DaftarPercakapan | null>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchPercakapanList().then((hasil) => {
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
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka pesan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Percakapan terikat ke akun yang mengirimnya, jadi riwayatnya hanya bisa dibuka setelah
          masuk.
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

  const belumDibaca = daftar?.meta.belumDibaca ?? 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pesan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {belumDibaca > 0
            ? `${belumDibaca} pesan belum dibaca.`
            : user.role === 'TENANT'
              ? 'Pertanyaan Anda tentang kos yang sedang Anda lihat, dan jawaban pemiliknya.'
              : 'Pertanyaan calon penghuni tentang kos Anda.'}
        </p>
      </header>

      <div className="mt-6">
        <Panel title="Percakapan" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Percakapan belum bisa dimuat. Periksa koneksi ke layanan API, lalu muat ulang halaman.
            </EmptyRow>
          ) : daftar.items.length === 0 ? (
            <EmptyRow>
              {user.role === 'TENANT'
                ? 'Belum ada percakapan. Buka halaman kos yang Anda minati dan kirim pertanyaan ke pemiliknya.'
                : 'Belum ada calon penghuni yang mengirim pertanyaan.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/pesan/${item.id}`}
                    className="flex items-start gap-3 rounded-xl px-1 py-3.5 transition-colors hover:bg-muted/60"
                  >
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                      <MessageSquare className="size-4" aria-hidden="true" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={cn(
                            'truncate text-sm',
                            item.belumDibaca > 0
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground',
                          )}
                        >
                          {item.lawanBicara}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTanggalJam(item.lastMessageAt)}
                        </span>
                      </span>

                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.propertyName}
                      </span>

                      <span className="mt-1 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {item.pesanTerakhir}
                        </span>
                        {item.belumDibaca > 0 && (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {item.belumDibaca}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {daftar !== null && daftar.items.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          {daftar.meta.total} percakapan tersimpan.
        </p>
      )}
    </div>
  )
}
