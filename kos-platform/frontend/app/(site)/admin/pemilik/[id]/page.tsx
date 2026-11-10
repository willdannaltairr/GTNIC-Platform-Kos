'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  JENIS_DOKUMEN,
  fetchPemilikDetail,
  putuskanPemilik,
  type PemilikDetail,
} from '@/lib/owner-verification'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Satu pemilik beserta dokumennya, untuk diputuskan admin.
 *
 * Keputusan hanya bisa diambil saat pengajuannya berstatus menunggu tinjauan.
 * Tombolnya tidak ditampilkan pada keadaan lain, bukan sekadar dimatikan:
 * tombol mati hanya meninggalkan pertanyaan "kenapa tidak bisa", sedangkan
 * keterangan di atasnya sudah menjelaskan keadaannya.
 *
 * Penolakan meminta catatan lebih dulu di tempat, dan server menolak penolakan
 * tanpa catatan. Aturannya sengaja ditegakkan di dua tempat: di sini supaya
 * admin tahu sebelum menekan, di sana supaya tidak bisa dilewati.
 *
 * Tautan dokumennya bertanda tangan dan berlaku beberapa menit. Halaman ini
 * memberi tahu hal itu, supaya admin tidak membagikan tautannya kepada orang
 * lain, dan tidak mengira tautannya rusak ketika kedaluwarsa.
 */
export default function AdminPemilikDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<PemilikDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)
  const [menolak, setMenolak] = useState(false)
  const [catatan, setCatatan] = useState('')

  const admin = user?.role === 'ADMIN'

  const muat = useCallback(async (): Promise<void> => {
    setData(await fetchPemilikDetail(params.id))
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || user.role !== 'ADMIN') {
      setSiap(true)
      return
    }

    void fetchPemilikDetail(params.id).then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const putuskan = async (ke: 'VERIFIED' | 'REJECTED', notes?: string): Promise<void> => {
    setSibuk(ke)
    setPesan(null)

    try {
      await putuskanPemilik(params.id, ke, notes)
      await muat()
      setMenolak(false)
      setCatatan('')
      setPesan({
        nada: 'sukses',
        teks:
          ke === 'VERIFIED'
            ? 'Pemilik ditandai terverifikasi.'
            : 'Pengajuan ditolak. Alasannya tersimpan dan terbaca pemiliknya.',
      })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Keputusan tidak tersimpan',
      })
    } finally {
      setSibuk(null)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk meninjau pemilik</h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Halaman ini untuk admin</h1>
        <Link
          href="/admin"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke panel admin
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyRow>
          Data pemilik tidak ditemukan. Pastikan tautannya benar, lalu kembali ke daftar pemilik.
        </EmptyRow>
        <div className="mt-4 text-center">
          <Link
            href="/admin/pemilik"
            className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Daftar pemilik
          </Link>
        </div>
      </div>
    )
  }

  const bisaPutuskan = data.status === 'UNDER_REVIEW'
  const ada = new Set(data.documents.map((doc) => doc.documentType))
  const kurang = JENIS_DOKUMEN.filter((jenis) => jenis.wajib && !ada.has(jenis.value))

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href="/admin/pemilik"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar pemilik
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">{data.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.phoneNumber ?? 'Nomor telepon belum diisi'}
            {data.businessName ? ` · ${data.businessName}` : ''} · mendaftar{' '}
            {formatTanggal(data.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.status} jenis="pemilik" />
          <StatusBadge status={data.accountStatus} jenis="akun" />
        </div>
      </header>

      {pesan && (
        <p
          role="status"
          className={cn(
            'mt-5 rounded-xl px-4 py-2.5 text-sm ring-1',
            pesan.nada === 'sukses'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-rose-50 text-rose-700 ring-rose-200',
          )}
        >
          {pesan.teks}
        </p>
      )}

      {kurang.length > 0 && (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-800 ring-1 ring-amber-200">
          Dokumen wajib belum lengkap: {kurang.map((jenis) => jenis.label).join(', ')}. Pengajuan
          seperti ini tidak bisa diputuskan.
        </p>
      )}

      <div className="mt-6">
        <Panel
          title="Dokumen"
          description="Tautan dokumen berlaku sekitar lima menit, lalu harus dimuat ulang dari halaman ini."
        >
          {data.documents.length === 0 ? (
            <EmptyRow>Pemilik ini belum mengunggah dokumen apa pun.</EmptyRow>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {data.documents.map((doc) => (
                <li key={doc.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{doc.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Diunggah {formatTanggal(doc.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={doc.verificationStatus} jenis="dokumen" />
                  </div>

                  {doc.rejectionReason && (
                    <p className="mt-2 text-xs leading-relaxed text-rose-700">
                      {doc.rejectionReason}
                    </p>
                  )}

                  <div className="mt-3">
                    {doc.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        Buka dokumen
                      </a>
                    ) : (
                      /* Dokumen ada barisnya tetapi tautannya gagal dibuat:
                         yang perlu diketahui admin adalah hal itu, bukan gambar
                         rusak yang membuatnya menebak-nebak. */
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Tautan dokumen tidak bisa dibuat. Muat ulang halaman, dan bila tetap
                        begitu, penyimpanan berkas belum dikonfigurasi di server.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold tracking-tight">Keputusan</h2>

        {bisaPutuskan ? (
          <>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pastikan nama dan wajah pada dokumen cocok, KTP-nya masih berlaku, dan swafotonya
              orang yang sama dengan pemilik akun ini.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void putuskan('VERIFIED')}
                disabled={sibuk !== null || kurang.length > 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
              >
                {sibuk === 'VERIFIED' && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                Setujui verifikasi
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenolak((nilai) => !nilai)
                  setCatatan('')
                }}
                disabled={sibuk !== null || kurang.length > 0}
                className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
              >
                Tolak pengajuan
              </button>
            </div>

            {menolak && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                <label className="block">
                  <span className="text-xs font-medium">Alasan penolakan, minimal 10 karakter</span>
                  <textarea
                    value={catatan}
                    onChange={(event) => setCatatan(event.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Mis. Foto KTP buram, bagian nomor induk tidak terbaca."
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void putuskan('REJECTED', catatan.trim())}
                    disabled={sibuk !== null || catatan.trim().length < 10}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
                  >
                    {sibuk === 'REJECTED' && (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    )}
                    Kirim penolakan
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenolak(false)}
                    className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Batal
                  </button>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Catatan ini dibaca pemiliknya, jadi tuliskan dokumen mana yang perlu diperbaiki.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {data.status === 'VERIFIED'
              ? `Pemilik ini sudah terverifikasi sejak ${formatTanggal(data.verifiedAt)}.`
              : data.status === 'NOT_SUBMITTED'
                ? 'Pemilik ini belum mengirim pengajuan, jadi belum ada yang bisa diputuskan.'
                : 'Pengajuan ini sudah diputuskan. Pemiliknya bisa mengirim ulang setelah mengganti dokumen.'}
          </p>
        )}
      </section>
    </div>
  )
}
