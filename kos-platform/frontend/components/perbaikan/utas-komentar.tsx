'use client'

import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { EmptyRow } from '@/components/dashboard/kit'
import { kirimKomentar, type KomentarLaporan } from '@/lib/maintenance'
import { formatTanggalJam } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Sebutan peran penulis komentar. */
const PERAN: Record<string, string> = {
  TENANT: 'Penghuni',
  OWNER: 'Pemilik kos',
  ADMIN: 'Admin',
}

/** Inisial nama untuk bulatan penanda. */
const inisial = (nama: string): string =>
  nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((bagian) => bagian[0]?.toUpperCase() ?? '')
    .join('') || '?'

/**
 * Utas percakapan pada satu laporan perbaikan.
 *
 * Status laporan hanya bisa dipindah pemilik, sedangkan rincian kerusakan sering
 * perlu ditanyakan lebih dulu. Sebelum ada utas ini, pertanyaan itu berpindah ke
 * pesan pribadi, dan jawabannya hilang dari laporan yang justru menjadi
 * catatannya.
 *
 * Komentar baru ditambahkan ke daftar yang sudah ada tanpa memuat ulang seluruh
 * laporan: memuat ulang akan menandatangani ulang semua foto, dan tautan foto
 * yang berubah membuat gambarnya berkedip di tengah percakapan.
 *
 * Yang boleh menulis sama dengan yang boleh membaca: penghuni pelapornya,
 * pemilik propertinya, dan admin. Penyaringnya di server.
 */
export function UtasKomentar({
  laporanId,
  komentar,
  namaSaya,
  peranSaya,
}: {
  laporanId: string
  komentar: KomentarLaporan[]
  namaSaya: string
  peranSaya: string
}) {
  const [daftar, setDaftar] = useState<KomentarLaporan[]>(komentar)
  const [isi, setIsi] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)

  // Daftar dari server bisa berubah setelah aksi lain di halaman ini (mis.
  // memuat ulang setelah mengunggah foto), jadi salinannya disamakan kembali.
  useEffect(() => {
    setDaftar(komentar)
  }, [komentar])

  const kirim = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const teks = isi.trim()
    if (teks.length < 3) {
      setPesan('Komentar minimal 3 karakter.')
      return
    }

    setSibuk(true)
    setPesan(null)

    try {
      const baru = await kirimKomentar(laporanId, teks)
      setDaftar((sebelumnya) => [...sebelumnya, baru])
      setIsi('')
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Komentar tidak terkirim.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div>
      {daftar.length === 0 ? (
        <EmptyRow>
          Belum ada percakapan. Tulis pertanyaan atau keterangan tambahan di bawah supaya
          keduanya tercatat bersama laporan ini.
        </EmptyRow>
      ) : (
        <ol className="flex flex-col gap-4">
          {daftar.map((item) => {
            const milikSaya = item.authorName === namaSaya && item.authorRole === peranSaya

            return (
              <li key={item.id} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                    item.authorRole === 'OWNER'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-accent-foreground',
                  )}
                >
                  {inisial(item.authorName)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{item.authorName}</span>{' '}
                    <span className="text-xs text-muted-foreground">
                      {PERAN[item.authorRole] ?? item.authorRole}
                      {milikSaya ? ' (Anda)' : ''} · {formatTanggalJam(item.createdAt)}
                    </span>
                  </p>

                  {/* Teks komentar ditampilkan apa adanya sebagai teks, bukan
                      diubah menjadi penanda: percakapan tentang kamar tidak
                      perlu bisa menyisipkan tautan atau gambar dari isinya. */}
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <form onSubmit={kirim} className="mt-5 border-t border-border pt-4">
        <label className="grid gap-1.5">
          <span className="text-xs font-medium">Tulis komentar</span>
          <textarea
            value={isi}
            onChange={(event) => setIsi(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Mis. Keran di kamar mandi menetes sejak kemarin malam"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        {pesan && (
          <p role="alert" className="mt-2 text-xs text-rose-700">
            {pesan}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={sibuk}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
          >
            {sibuk ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Kirim komentar
          </button>

          <span className="text-xs text-muted-foreground">
            {2000 - isi.length} karakter tersisa
          </span>
        </div>
      </form>
    </div>
  )
}
