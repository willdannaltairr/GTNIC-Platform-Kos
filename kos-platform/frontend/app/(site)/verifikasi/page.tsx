'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  JENIS_DOKUMEN,
  fetchVerifikasiSaya,
  hapusDokumen,
  kirimPengajuanVerifikasi,
  unggahDokumen,
  type DokumenVerifikasi,
  type JenisDokumen,
  type VerifikasiPemilik,
} from '@/lib/owner-verification'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Verifikasi pemilik kos.
 *
 * Pemilik mengunggah dokumen satu per satu, dan setiap unggahan langsung
 * tersimpan. Tidak ada tombol "simpan" tersendiri: berkas yang sudah terunggah
 * tetap ada walau halamannya ditutup, dan itu memang yang diharapkan orang
 * yang mengunggah lima dokumen berurutan.
 *
 * Tombol pengajuan baru aktif ketika dokumen wajib sudah lengkap. Server tetap
 * memeriksa kelengkapannya, jadi aturan ini ditegakkan di dua tempat dengan
 * sengaja: di sini supaya pemilik tahu sebelum menekan, di sana supaya tidak
 * bisa dilewati.
 *
 * Saat pengajuan sedang ditinjau, unggahan dan penghapusan dimatikan. Mengganti
 * dokumen di tengah peninjauan membuat admin memeriksa berkas yang sudah tidak
 * berlaku lagi.
 */
export default function VerifikasiPage() {
  const { user, status } = useSession()
  const [data, setData] = useState<VerifikasiPemilik | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)

  const muat = useCallback(async (): Promise<void> => {
    setData(await fetchVerifikasiSaya())
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchVerifikasiSaya().then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const jalankan = async (kunci: string, aksi: () => Promise<unknown>, sukses: string) => {
    setSibuk(kunci)
    setPesan(null)

    try {
      await aksi()
      await muat()
      setPesan({ nada: 'sukses', teks: sukses })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Perubahan tidak tersimpan',
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
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk memverifikasi akun</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Verifikasi pemilik berisi dokumen identitas, jadi hanya bisa dibuka oleh pemilik akunnya.
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

  if (user.role !== 'OWNER') {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Halaman ini untuk pemilik kos</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Verifikasi identitas pemilik dipakai untuk menerbitkan kos. Akun Anda terdaftar sebagai
          pencari kos.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke dashboard
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyRow>
          Status verifikasi belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
        </EmptyRow>
      </div>
    )
  }

  const terkunci = data.status === 'UNDER_REVIEW' || data.status === 'VERIFIED'
  const sudahAda = new Set(data.documents.map((doc) => doc.documentType))
  const kurang = JENIS_DOKUMEN.filter((jenis) => jenis.wajib && !sudahAda.has(jenis.value))
  const bolehKirim = data.status !== 'UNDER_REVIEW' && data.status !== 'VERIFIED'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Verifikasi pemilik</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Dokumen identitas dipakai untuk memastikan kos yang Anda daftarkan benar milik Anda.
            Hanya admin platform yang bisa membukanya.
          </p>
        </div>

        <StatusBadge status={data.status} jenis="pemilik" />
      </header>

      {data.status === 'VERIFIED' && (
        <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800 ring-1 ring-emerald-200">
          Akun Anda terverifikasi sejak {formatTanggal(data.verifiedAt)}. Properti yang sudah lolos
          moderasi bisa langsung diterbitkan.
        </p>
      )}

      {data.status === 'UNDER_REVIEW' && (
        <p className="mt-5 rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-800 ring-1 ring-sky-200">
          Pengajuan Anda sedang ditinjau admin. Dokumen tidak bisa diganti sampai keputusannya keluar.
        </p>
      )}

      {data.status === 'REJECTED' && data.rejectionReason && (
        <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
          <p className="text-sm font-semibold text-rose-800">Pengajuan sebelumnya ditolak</p>
          <p className="mt-1 text-sm leading-relaxed text-rose-700">{data.rejectionReason}</p>
          <p className="mt-2 text-xs leading-relaxed text-rose-700/80">
            Ganti dokumen yang dimaksud di bawah, lalu kirim ulang pengajuannya.
          </p>
        </div>
      )}

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

      <div className="mt-6">
        <Panel
          title="Dokumen"
          description="Format JPEG, PNG, atau WebP, maksimal 8 MB per berkas. Data pada foto harus terbaca."
        >
          <ul className="divide-y divide-border">
            {JENIS_DOKUMEN.map((jenis) => {
              const dokumen = data.documents.find((doc) => doc.documentType === jenis.value)

              return (
                <li key={jenis.value} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {jenis.label}
                        {jenis.wajib ? (
                          <span className="ml-2 text-[11px] font-medium uppercase tracking-[0.1em] text-rose-600">
                            wajib
                          </span>
                        ) : (
                          <span className="ml-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                            opsional
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
                        {jenis.hint}
                      </p>
                      {dokumen?.createdAt && (
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          Diunggah {formatTanggal(dokumen.createdAt)}
                          {dokumen.rejectionReason ? `, ditolak: ${dokumen.rejectionReason}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {dokumen ? (
                        <StatusBadge status={dokumen.verificationStatus} jenis="dokumen" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Belum ada</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {dokumen?.signedUrl && (
                      <a
                        href={dokumen.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        <ImageIcon className="size-3.5" aria-hidden="true" />
                        Lihat dokumen
                      </a>
                    )}

                    {!terkunci && (
                      <UnggahBerkas
                        jenis={jenis.value as JenisDokumen}
                        label={dokumen ? 'Ganti berkas' : 'Unggah berkas'}
                        sibuk={sibuk === `unggah-${jenis.value}`}
                        onPilih={(file) =>
                          jalankan(
                            `unggah-${jenis.value}`,
                            () => unggahDokumen(jenis.value as JenisDokumen, file),
                            `${jenis.label} tersimpan.`,
                          )
                        }
                      />
                    )}

                    {dokumen && !terkunci && (
                      <button
                        type="button"
                        onClick={() =>
                          jalankan(
                            `hapus-${jenis.value}`,
                            () => hapusDokumen(dokumen.id),
                            `${jenis.label} dihapus.`,
                          )
                        }
                        disabled={sibuk !== null}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
                      >
                        {sibuk === `hapus-${jenis.value}` ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        )}
                        Hapus
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      {bolehKirim && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-tight">Kirim pengajuan</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {kurang.length === 0
              ? 'Dokumen wajib sudah lengkap. Setelah dikirim, admin meninjau dan memberi keputusan.'
              : `Lengkapi dulu: ${kurang.map((jenis) => jenis.label).join(', ')}.`}
          </p>

          <button
            type="button"
            onClick={() =>
              jalankan(
                'kirim',
                kirimPengajuanVerifikasi,
                'Pengajuan terkirim. Keputusannya muncul di halaman ini.',
              )
            }
            disabled={kurang.length > 0 || sibuk !== null}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
          >
            {sibuk === 'kirim' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {sibuk === 'kirim' ? 'Mengirim...' : 'Kirim untuk ditinjau'}
          </button>
        </section>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Dokumen disimpan di penyimpanan privat dan hanya dibuka lewat tautan bertanda tangan yang
        berlaku beberapa menit. Setelah verifikasi selesai, dokumennya tidak dipakai lagi untuk hal
        lain.
      </p>
    </div>
  )
}

/**
 * Tombol pilih berkas.
 *
 * Isian berkasnya asli tetapi disembunyikan, dan yang terlihat adalah tombol
 * bergaya sama dengan tombol lain di halaman ini. Isian berkas bawaan peramban
 * berbeda bentuk di setiap sistem, dan perbedaan itu yang membuat formulir
 * terlihat tidak selesai.
 */
function UnggahBerkas({
  jenis,
  label,
  sibuk,
  onPilih,
}: {
  jenis: JenisDokumen
  label: string
  sibuk: boolean
  onPilih: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Nilainya dikosongkan lagi supaya memilih berkas yang sama setelah
          // gagal tetap memicu perubahan, bukan diam tanpa reaksi.
          event.target.value = ''
          if (file) onPilih(file)
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={sibuk}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        {sibuk ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="size-3.5" aria-hidden="true" />
        )}
        {sibuk ? 'Mengunggah...' : label}
        <span className="sr-only">{`, jenis dokumen ${jenis}`}</span>
      </button>
    </>
  )
}
