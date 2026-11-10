'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  History,
  MinusCircle,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatKartu, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchRiwayatKamar,
  LABEL_JENIS,
  type ArahPerubahan,
  type RiwayatKamar,
} from '@/lib/room-condition'
import { formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Paspor kamar: riwayat pemeriksaan kondisinya beserta perbandingannya.
 *
 * Yang dibaca pemilik di sini bukan daftar laporan, melainkan jawaban atas satu
 * pertanyaan: apa yang berubah sejak kamar ini pertama diperiksa. Karena itu
 * perbandingannya ditaruh di atas, dan riwayat lengkapnya di bawah sebagai bukti
 * yang bisa ditelusuri.
 *
 * Arah perubahan ditampilkan apa adanya, termasuk yang tidak bisa diberi arah.
 * Perubahan dari "tidak ada" menjadi "rusak ringan" tidak disebut membaik atau
 * memburuk, karena pencatatnya bisa bermaksud apa saja; yang menebak akan
 * menghasilkan kesimpulan yang salah separuh waktu.
 */

interface GayaArah {
  label: string
  /** Kelas lencana; arah yang tidak butuh perhatian dibuat netral. */
  kelas: string
  icon: typeof TrendingUp
  keterangan: string
}

const ARAH: Record<ArahPerubahan, GayaArah> = {
  MEMBURUK: {
    label: 'Memburuk',
    kelas: 'bg-rose-50 text-rose-700 ring-rose-200',
    icon: TrendingDown,
    keterangan: 'Keadaannya lebih buruk daripada pemeriksaan awal.',
  },
  MEMBAIK: {
    label: 'Membaik',
    kelas: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    icon: TrendingUp,
    keterangan: 'Keadaannya lebih baik daripada pemeriksaan awal.',
  },
  SAMA: {
    label: 'Sama',
    kelas: 'bg-muted text-muted-foreground ring-border',
    icon: MinusCircle,
    keterangan: 'Tidak berubah antara kedua pemeriksaan.',
  },
  BARU: {
    label: 'Butir baru',
    kelas: 'bg-accent text-accent-foreground ring-primary/20',
    icon: ArrowRight,
    keterangan: 'Baru dicatat pada pemeriksaan terakhir, belum ada di pemeriksaan awal.',
  },
  HILANG: {
    label: 'Tidak tercatat lagi',
    kelas: 'bg-muted text-muted-foreground ring-border',
    icon: ArrowLeft,
    keterangan: 'Ada di pemeriksaan awal, tetapi tidak lagi dicatat di pemeriksaan terakhir.',
  },
  BELUM_LENGKAP: {
    label: 'Belum lengkap',
    kelas: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: TriangleAlert,
    keterangan: 'Salah satu pemeriksaan belum mengisi keadaan butir ini.',
  },
  BERBEDA: {
    label: 'Berbeda',
    kelas: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: TriangleAlert,
    keterangan: 'Keadaannya berubah, tetapi arah perubahannya tidak bisa ditentukan.',
  },
}

const LABEL_KEADAAN: Record<string, string> = {
  BAIK: 'Baik',
  RUSAK_RINGAN: 'Rusak ringan',
  RUSAK_BERAT: 'Rusak berat',
  TIDAK_ADA: 'Tidak ada',
}

export default function RiwayatKamarPage() {
  const params = useParams<{ roomId: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<RiwayatKamar | null>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchRiwayatKamar(params.roomId).then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.roomId])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Masuk untuk membuka riwayat kamar
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Riwayat kondisi kamar hanya terbuka untuk penghuni yang menempatinya dan pemilik
          propertinya.
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

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <Link
          href="/kondisi-kamar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Daftar pemeriksaan
        </Link>

        <h1 className="mt-4 text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
          Riwayat kamar tidak bisa dibuka
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Kamar ini tidak ditemukan di akun Anda, atau layanan API sedang tidak bisa dihubungi. Kamar
          yang riwayatnya bisa dibuka adalah kamar yang Anda tempati sendiri, dan kamar milik properti
          Anda bila Anda pemiliknya.
        </p>
      </div>
    )
  }

  const { kamar, perbandingan, meta } = data
  // Perubahan yang tidak butuh perhatian disaring keluar: daftar yang isinya
  // sebagian besar "sama" menyembunyikan baris yang justru perlu ditindak.
  const perluPerhatian =
    perbandingan?.butir.filter(
      (butir) => butir.arah === 'MEMBURUK' || butir.arah === 'BERBEDA' || butir.arah === 'BELUM_LENGKAP',
    ) ?? []

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href="/kondisi-kamar"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar pemeriksaan
      </Link>

      <header className="mt-4">
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
          Riwayat kamar {kamar.roomNumber}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {kamar.propertyName} · {meta.jumlahPemeriksaan} pemeriksaan tercatat. Perbandingan di bawah
          memakai pemeriksaan pertama dan terakhir yang daftar periksanya terisi.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatKartu
          label="Pemeriksaan"
          value={meta.jumlahPemeriksaan}
          hint={`${meta.jumlahBerisiButir} di antaranya berisi daftar periksa`}
          icon={History}
        />
        <StatKartu
          label="Menunggu keputusan"
          value={meta.belumDisetujui}
          hint="Sudah dikirim, belum disetujui pemilik"
          icon={ClipboardList}
        />
        <StatKartu
          label="Rusak sekarang"
          value={meta.rusakSekarang}
          hint="Butir rusak menurut pemeriksaan terakhir"
          icon={TriangleAlert}
        />
        <StatKartu
          label="Perubahan"
          value={`${meta.membaik} / ${meta.memburuk}`}
          hint="Membaik / memburuk sejak pemeriksaan awal"
          icon={TrendingUp}
        />
      </div>

      {meta.jumlahPemeriksaan === 0 ? (
        <div className="mt-6">
          <EmptyRow>
            Belum ada pemeriksaan kondisi untuk kamar ini. Pemeriksaan dibuat penghuni dari halaman
            kondisi kamar, memakai kontrak sewanya.
          </EmptyRow>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <Panel
            title="Perbandingan kondisi"
            description={
              perbandingan
                ? `${formatTanggal(perbandingan.dari.reportDate ?? perbandingan.dari.createdAt)} sampai ${formatTanggal(perbandingan.ke.reportDate ?? perbandingan.ke.createdAt)} · ${LABEL_JENIS[perbandingan.ke.reportType] ?? perbandingan.ke.reportType} sebagai acuan terakhir.`
                : 'Perbandingan muncul setelah ada dua pemeriksaan yang daftar periksanya terisi.'
            }
          >
            {!perbandingan ? (
              <EmptyRow>
                Baru ada satu pemeriksaan yang daftar periksanya terisi, jadi belum ada yang bisa
                dibandingkan. Perbandingannya akan tersusun sendiri begitu pemeriksaan berikutnya
                diisi.
              </EmptyRow>
            ) : (
              <>
                {perluPerhatian.length > 0 && (
                  <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 ring-1 ring-amber-200">
                    {perluPerhatian.length} butir perlu diperhatikan: keadaannya memburuk, berubah
                    tanpa arah yang jelas, atau belum selesai diperiksa.
                  </p>
                )}

                <ul className="divide-y divide-border">
                  {perbandingan.butir.map((butir) => {
                    const gaya = ARAH[butir.arah]
                    const Icon = gaya.icon

                    return (
                      <li
                        key={butir.itemName}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <p className="min-w-0 flex-1 text-sm font-medium">{butir.itemName}</p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {butir.dari ? (
                            <StatusBadge status={butir.dari} jenis="keadaan" />
                          ) : (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold ring-1 ring-border">
                              Belum ada
                            </span>
                          )}

                          <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />

                          {butir.ke ? (
                            <StatusBadge status={butir.ke} jenis="keadaan" />
                          ) : (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold ring-1 ring-border">
                              Tidak dicatat
                            </span>
                          )}

                          <span
                            title={gaya.keterangan}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                              gaya.kelas,
                            )}
                          >
                            <Icon className="size-3" aria-hidden="true" />
                            {gaya.label}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                  Butir dicocokkan menurut namanya. Bagian yang ditulis dengan nama berbeda di kedua
                  pemeriksaan muncul sebagai butir baru atau tidak tercatat lagi, bukan sebagai
                  perubahan keadaan.
                </p>
              </>
            )}
          </Panel>

          <Panel title="Riwayat pemeriksaan" description="Terlama lebih dulu, mengikuti urutan paspor.">
            <ol className="space-y-3">
              {data.laporan.map((item, urutan) => {
                const rusak =
                  item.ringkasan.RUSAK_RINGAN + item.ringkasan.RUSAK_BERAT

                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-border p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold tabular-nums text-accent-foreground">
                            {urutan + 1}
                          </span>
                          {LABEL_JENIS[item.reportType] ?? item.reportType}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTanggal(item.reportDate ?? item.createdAt)}
                          {item.tenantName ? ` · ${item.tenantName}` : ''}
                          {item.contractNumber ? ` · ${item.contractNumber}` : ''}
                        </p>
                      </div>

                      <StatusBadge status={item.status} jenis="kondisi" />
                    </div>

                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{item.jumlahButir} butir periksa</span>
                      <span>{item.jumlahFoto} foto</span>
                      <span>{item.ringkasan.BAIK} baik</span>
                      <span className={rusak > 0 ? 'font-medium text-rose-700' : undefined}>
                        {rusak} rusak
                      </span>
                      {item.ringkasan.belumDiperiksa > 0 && (
                        <span>{item.ringkasan.belumDiperiksa} belum diperiksa</span>
                      )}
                    </p>

                    <div className="mt-3">
                      <Link
                        href={`/kondisi-kamar/${item.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                      >
                        Buka pemeriksaan
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Panel>
        </div>
      )}
    </div>
  )
}
