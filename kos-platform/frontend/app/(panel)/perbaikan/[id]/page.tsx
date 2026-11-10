'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Camera, Loader2, Trash2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { UtasKomentar } from '@/components/perbaikan/utas-komentar'
import {
  deleteFotoLaporan,
  fetchLaporanDetail,
  labelKategori,
  ubahStatusLaporan,
  uploadFotoLaporan,
  type LaporanDetail,
  type PerbaikanStatus,
} from '@/lib/maintenance'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Satu laporan perbaikan.
 *
 * Halaman ini tempat kedua pihak bekerja: penghuni menambahkan foto bukti,
 * pemilik memindahkan statusnya. Perpindahan yang mungkin ditulis tetap di sini
 * hanya untuk memilih tombol mana yang tampil; server tetap menolak yang tidak
 * sah, dan pesannya ditampilkan apa adanya.
 *
 * Laporan yang sudah ditutup berhenti menerima foto baru, dan fotonya pun tidak
 * bisa dihapus lagi oleh pemilik properti: foto itu bukti keadaan kamar saat
 * kerusakan terjadi, dan pihak yang menangani kerusakannya tidak boleh
 * menghapusnya sebelum laporannya ditutup.
 */

/** Perpindahan yang mungkin dari tiap status. Salinan dari aturan server. */
const LANJUTAN: Record<string, PerbaikanStatus[]> = {
  OPEN: ['REVIEWING', 'IN_PROGRESS', 'REJECTED'],
  REVIEWING: ['IN_PROGRESS', 'WAITING_FOR_PARTS', 'REJECTED'],
  IN_PROGRESS: ['WAITING_FOR_PARTS', 'RESOLVED'],
  WAITING_FOR_PARTS: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  REJECTED: ['CLOSED', 'REVIEWING'],
  CLOSED: [],
}

/** Sebutan tombol untuk tiap status tujuan. */
const LABEL_TOMBOL: Record<string, string> = {
  REVIEWING: 'Tandai ditinjau',
  IN_PROGRESS: 'Sedang dikerjakan',
  WAITING_FOR_PARTS: 'Menunggu suku cadang',
  RESOLVED: 'Tandai selesai',
  REJECTED: 'Tolak laporan',
  CLOSED: 'Tutup laporan',
}

export default function PerbaikanDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<LaporanDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [catatan, setCatatan] = useState('')
  const [tujuan, setTujuan] = useState<PerbaikanStatus | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const berkasRef = useRef<HTMLInputElement>(null)

  const muat = useCallback(async (): Promise<void> => {
    setData(await fetchLaporanDetail(params.id))
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchLaporanDetail(params.id).then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const jalankan = async (aksi: () => Promise<unknown>, pesanSukses: string): Promise<void> => {
    setSibuk(true)
    setPesan(null)
    setSukses(null)

    try {
      await aksi()
      await muat()
      setSukses(pesanSukses)
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Perubahan tidak tersimpan')
    } finally {
      setSibuk(false)
    }
  }

  const kirimFoto = async (berkas: File): Promise<void> => {
    await uploadFotoLaporan(params.id, berkas)
  }

  const kirimStatus = async (statusBaru: PerbaikanStatus): Promise<void> => {
    // Penolakan wajib beralasan di sisi server, jadi diperiksa lebih dulu di
    // sini supaya penghuni tidak menunggu perjalanan bolak-balik untuk tahu.
    if (statusBaru === 'REJECTED' && catatan.trim().length < 10) {
      setPesan('Alasan penolakan minimal 10 karakter, supaya penghuni tahu apa yang perlu diperbaiki.')
      return
    }

    await jalankan(async () => {
      await ubahStatusLaporan(params.id, statusBaru, { notes: catatan.trim() || undefined })
      setCatatan('')
      setTujuan(null)
    }, 'Status laporan diperbarui')
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk membuka laporan</h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Laporan tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Laporan ini mungkin sudah dihapus, atau bukan milik akun Anda.
        </p>
        <Link
          href="/perbaikan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke daftar laporan
        </Link>
      </div>
    )
  }

  const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'
  const admin = user.role === 'ADMIN'
  const bolehUnggah = !admin && !['CLOSED'].includes(data.status)
  const lanjutan = LANJUTAN[data.status] ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href="/perbaikan"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar laporan
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">{data.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {labelKategori(data.category)} · {data.propertyName}
            {data.roomNumber ? `, kamar ${data.roomNumber}` : ''} · dilaporkan{' '}
            {formatTanggal(data.createdAt)}
            {pemilik ? ` oleh ${data.tenantName}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={data.priority} jenis="prioritas" />
          <StatusBadge status={data.status} jenis="perbaikan" />
        </div>
      </header>

      {data.description && (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {data.description}
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

      {sukses && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
          {sukses}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {pemilik && lanjutan.length > 0 && (
          <Panel
            title="Tindakan"
            description="Setiap perpindahan meninggalkan catatan di riwayat laporan."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {lanjutan.map((statusBaru) => (
                <button
                  key={statusBaru}
                  type="button"
                  disabled={sibuk}
                  onClick={() => {
                    setTujuan(statusBaru)
                    setPesan(null)
                  }}
                  aria-pressed={tujuan === statusBaru}
                  className={cn(
                    'inline-flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors disabled:opacity-60',
                    tujuan === statusBaru
                      ? 'border-primary bg-secondary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {LABEL_TOMBOL[statusBaru] ?? statusBaru}
                </button>
              ))}
            </div>

            {tujuan && (
              <div className="mt-4 border-t border-border pt-4">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium">
                    Catatan{tujuan === 'REJECTED' ? ' (wajib, minimal 10 karakter)' : ' (opsional)'}
                  </span>
                  <textarea
                    value={catatan}
                    onChange={(event) => setCatatan(event.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder={
                      tujuan === 'REJECTED'
                        ? 'Mis. Kerusakan ini termasuk perawatan rutin yang ditanggung penghuni'
                        : 'Mis. Teknisi datang besok pagi'
                    }
                    className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={sibuk}
                    onClick={() => kirimStatus(tujuan)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
                  >
                    {sibuk && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Simpan perubahan status
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTujuan(null)
                      setCatatan('')
                    }}
                    className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </Panel>
        )}

        <Panel
          title="Foto keadaan"
          description={
            data.photos.length === 0
              ? 'Belum ada foto. Foto membantu pemilik menilai kerusakannya sebelum datang.'
              : `${data.photos.length} foto. Tautannya berlaku beberapa menit, jadi muat ulang halaman bila gambarnya tidak muncul.`
          }
        >
          {data.photos.length === 0 ? (
            <EmptyRow>Belum ada foto untuk laporan ini.</EmptyRow>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.photos.map((foto) => (
                <li key={foto.id} className="group relative">
                  <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-muted">
                    {foto.signedUrl ? (
                      // Foto ada di bucket privat, jadi URL-nya bertanda tangan
                      // dan berumur pendek. Memakai `img` biasa, bukan
                      // `next/image`, karena tautannya berubah setiap kali
                      // ditandatangani dan optimizer Next akan menyimpannya
                      // sebagai gambar yang berbeda-beda.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={foto.signedUrl}
                        alt={`Foto laporan: ${data.title}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full place-items-center px-2 text-center text-xs text-muted-foreground">
                        Foto tidak bisa dimuat
                      </span>
                    )}
                  </div>

                  {!admin && foto.uploadedBy === user.id && (
                    <button
                      type="button"
                      disabled={sibuk}
                      onClick={() =>
                        jalankan(() => deleteFotoLaporan(data.id, foto.id), 'Foto dihapus')
                      }
                      aria-label={`Hapus foto laporan ${data.title}`}
                      className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-rose-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                    >
                      {sibuk ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  )}

                  <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                    {foto.uploaderName} · {formatTanggal(foto.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {bolehUnggah && (
            <div className="mt-4 border-t border-border pt-4">
              <input
                ref={berkasRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const berkas = event.target.files?.[0]
                  if (!berkas) return
                  void jalankan(() => kirimFoto(berkas), 'Foto terunggah')
                  event.target.value = ''
                }}
              />

              <button
                type="button"
                disabled={sibuk}
                onClick={() => berkasRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
              >
                {sibuk ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="size-4" aria-hidden="true" />
                )}
                Tambah foto
              </button>

              <p className="mt-2 text-xs text-muted-foreground">
                JPEG, PNG, atau WebP, maksimal 8 MB. Hanya penghuni pelapor dan pemilik propertinya
                yang bisa menambahkan foto.
              </p>
            </div>
          )}

          {admin && (
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Admin memutuskan sengketa dengan membaca bukti, bukan dengan menambah atau menghapus
              fotonya.
            </p>
          )}
        </Panel>

        <Panel
          title="Percakapan"
          description="Tempat penghuni menjelaskan dan pemilik menanggapi, tercatat bersama laporan ini."
        >
          <UtasKomentar
            laporanId={data.id}
            komentar={data.komentar ?? []}
            namaSaya={user.full_name}
            peranSaya={user.role}
          />
        </Panel>

        <Panel title="Riwayat" description="Perjalanan status laporan ini, terlama lebih dulu.">
          {data.riwayat.length === 0 ? (
            <EmptyRow>Belum ada perpindahan status.</EmptyRow>
          ) : (
            <ol className="space-y-3">
              {data.riwayat.map((baris) => (
                <li key={baris.id} className="flex gap-3">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      <StatusBadge status={baris.newStatus} jenis="perbaikan" />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTanggal(baris.createdAt)}
                      {baris.changedByName ? ` · ${baris.changedByName}` : ''}
                    </p>
                    {baris.notes && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {baris.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  )
}
