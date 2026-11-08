'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, Loader2, Plus } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  addVisitNote,
  fetchVisit,
  saveChecklist,
  toggleChecklistItem,
  type KunjunganDetail,
} from '@/lib/visits'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Butir periksa baku untuk survei kos.
 *
 * Daftarnya tetap, bukan diisi bebas, karena tujuannya membandingkan beberapa
 * kos dengan ukuran yang sama. Butir yang diketik sendiri berbeda-beda tiap
 * kunjungan, dan hasilnya tidak bisa dibandingkan.
 *
 * Daftar ini baru disimpan setelah ditekan "Simpan daftar periksa". Menyimpan
 * tiap centang satu per satu berarti jaringan yang buruk memutus pengisian di
 * tengah jalan dengan separuh butir tersimpan.
 */
const BUTIR_BAKU = [
  'Kebersihan kamar',
  'Kondisi kamar mandi',
  'Ventilasi dan sirkulasi udara',
  'Pencahayaan alami',
  'Keamanan dan akses masuk',
  'Kekuatan sinyal internet',
  'Fasilitas sesuai keterangan',
  'Tingkat kebisingan',
  'Kondisi lingkungan sekitar',
  'Kesesuaian harga dengan kesepakatan',
]

export default function KunjunganDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<KunjunganDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [centang, setCentang] = useState<Record<string, boolean>>({})
  const [catatanBaru, setCatatanBaru] = useState('')
  const [kategori, setKategori] = useState('harga')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)

  const muat = useCallback(async (): Promise<void> => {
    const hasil = await fetchVisit(params.id)
    setData(hasil)

    if (hasil) {
      const keadaan: Record<string, boolean> = {}
      for (const butir of hasil.checklist) keadaan[butir.id] = butir.checked
      setCentang(keadaan)
    }
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchVisit(params.id).then((hasil) => {
      if (!aktif) return
      setData(hasil)
      if (hasil) {
        const keadaan: Record<string, boolean> = {}
        for (const butir of hasil.checklist) keadaan[butir.id] = butir.checked
        setCentang(keadaan)
      }
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const simpanButir = async (butir: string): Promise<void> => {
    setSibuk(true)
    setPesan(null)

    const hasil = await saveChecklist(params.id, [{ item: butir, checked: false }])

    if (hasil) {
      setData(hasil)
    } else {
      setPesan('Butir periksa tidak tersimpan.')
    }

    setSibuk(false)
  }

  const isiBaku = async (): Promise<void> => {
    setSibuk(true)
    setPesan(null)

    const sudahAda = new Set(data?.checklist.map((butir) => butir.item) ?? [])
    const belum = BUTIR_BAKU.filter((butir) => !sudahAda.has(butir))

    if (belum.length === 0) {
      setPesan('Semua butir baku sudah ada di daftar.')
      setSibuk(false)
      return
    }

    const hasil = await saveChecklist(
      params.id,
      belum.map((butir) => ({ item: butir, checked: false })),
    )

    if (hasil) {
      setData(hasil)
      const keadaan: Record<string, boolean> = {}
      for (const butir of hasil.checklist) keadaan[butir.id] = butir.checked
      setCentang(keadaan)
    } else {
      setPesan('Daftar periksa tidak tersimpan.')
    }

    setSibuk(false)
  }

  const ubahCentang = async (itemId: string): Promise<void> => {
    const tujuan = !centang[itemId]
    setCentang((nilai) => ({ ...nilai, [itemId]: tujuan }))

    const berhasil = await toggleChecklistItem(params.id, itemId, tujuan)

    // Dikembalikan ke keadaan server bila permintaannya gagal, supaya centang
    // yang tampil tidak pernah berbeda dari yang tersimpan.
    if (!berhasil) setCentang((nilai) => ({ ...nilai, [itemId]: !tujuan }))
  }

  const kirimCatatan = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const isi = catatanBaru.trim()
    if (!isi) return

    setSibuk(true)
    const hasil = await addVisitNote(params.id, kategori, isi)

    if (hasil) {
      setCatatanBaru('')
      await muat()
    } else {
      setPesan('Catatan tidak tersimpan.')
    }

    setSibuk(false)
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka kunjungan</h1>
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
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Kunjungan tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Jadwal ini mungkin sudah dihapus, atau bukan milik akun Anda.
        </p>
        <Link
          href="/kunjungan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke daftar kunjungan
        </Link>
      </div>
    )
  }

  const terisi = data.checklist.filter((butir) => centang[butir.id]).length

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/kunjungan"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar kunjungan
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.propertyName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatTanggal(data.scheduledAt)}
            {data.roomNumber ? ` · kamar ${data.roomNumber}` : ''} · {data.tenantName}
          </p>
        </div>
        <StatusBadge status={data.status} jenis="kunjungan" />
      </header>

      {data.notes && (
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {data.notes}
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

      <div className="mt-6 space-y-6">
        <Panel
          title="Daftar periksa"
          description={
            data.checklist.length > 0
              ? `${terisi} dari ${data.checklist.length} butir tercentang.`
              : 'Belum ada butir periksa.'
          }
        >
          {data.checklist.length === 0 ? (
            <EmptyRow>
              Belum ada butir periksa. Isi daftar bakunya supaya kondisinya bisa dibandingkan dengan
              kos lain.
            </EmptyRow>
          ) : (
            <ul className="space-y-1">
              {data.checklist.map((butir) => (
                <li key={butir.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                    <input
                      type="checkbox"
                      checked={centang[butir.id] ?? false}
                      onChange={() => ubahCentang(butir.id)}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span
                      className={cn(
                        'text-sm',
                        centang[butir.id] ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {butir.item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={isiBaku}
              disabled={sibuk}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              {sibuk ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              Isi butir periksa baku
            </button>

            <button
              type="button"
              onClick={() => simpanButir('Catatan lain')}
              disabled={sibuk}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              Tambah butir kosong
            </button>
          </div>
        </Panel>

        <Panel title="Catatan temuan" description="Ditulis saat atau sesudah kunjungan.">
          <form onSubmit={kirimCatatan} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="grid gap-1.5 sm:w-48">
                <span className="text-xs font-medium">Kategori</span>
                <select
                  value={kategori}
                  onChange={(event) => setKategori(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="harga">Harga dan biaya</option>
                  <option value="fasilitas">Fasilitas</option>
                  <option value="kebersihan">Kebersihan</option>
                  <option value="keamanan">Keamanan</option>
                  <option value="lingkungan">Lingkungan</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </label>

              <label className="grid flex-1 gap-1.5">
                <span className="text-xs font-medium">Catatan</span>
                <input
                  value={catatanBaru}
                  onChange={(event) => setCatatanBaru(event.target.value)}
                  placeholder="Mis. air panas hanya sampai jam sepuluh malam"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={sibuk || catatanBaru.trim().length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
            >
              {sibuk ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Simpan catatan
            </button>

            {data.catatan.length > 0 && (
              <ul className="divide-y divide-border border-t border-border pt-2">
                {data.catatan.map((catatan) => (
                  <li key={catatan.id} className="py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {catatan.category}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{catatan.content}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {formatTanggal(catatan.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </Panel>
      </div>
    </div>
  )
}
