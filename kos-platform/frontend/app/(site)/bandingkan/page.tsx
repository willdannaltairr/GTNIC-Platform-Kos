'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Scale, X } from 'lucide-react'
import { EmptyRow, StatusBadge } from '@/components/dashboard/kit'
import { fetchProperty, type PropertyDetail } from '@/lib/api'
import { MAKS_BANDINGKAN, useBandingkan } from '@/lib/bandingkan'
import {
  BATHROOM_LABEL,
  COST_CONFIDENCE_CLASS,
  COST_CONFIDENCE_LABEL,
  PROPERTY_TYPE_LABEL,
  formatLastConfirmed,
  formatNumber,
  formatRupiah,
} from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Perbandingan kos.
 *
 * Pilihannya datang dari peramban (lihat `lib/bandingkan.ts`), lalu isinya
 * diambil satu per satu dari API. Yang ditampilkan hanya angka yang memang
 * tercatat: harga sewa, deposit, estimasi biaya, fasilitas, dan ketersediaan.
 * Tidak ada skor kecocokan di sini — angka seperti itu hanya berarti kalau
 * formulanya bisa diperiksa, dan itu pekerjaan KosMatch, bukan halaman ini.
 *
 * Yang ditandai "termurah" adalah harga sewa terendah di antara yang sedang
 * dibandingkan, bukan di antara seluruh kos di platform. Itu perbandingan yang
 * sedang dilakukan pembacanya, dan menyebutnya "termurah" tanpa keterangan akan
 * terbaca sebagai klaim yang lebih luas.
 */

interface Kolom {
  slug: string
  properti: PropertyDetail | null
  /** true selama permintaannya belum selesai; membedakan "sedang dimuat" dari "tidak ada". */
  memuat: boolean
}

export default function BandingkanPage() {
  const { daftar, siap, hapus, bersihkan } = useBandingkan()
  const [kolom, setKolom] = useState<Kolom[]>([])
  const [memuat, setMemuat] = useState(false)

  useEffect(() => {
    if (!siap) return

    if (daftar.length === 0) {
      setKolom([])
      return
    }

    let aktif = true
    setMemuat(true)

    // Seluruh pilihannya diambil bersamaan, bukan berurutan: jumlahnya paling
    // banyak empat, dan menunggunya satu per satu membuat halaman terisi
    // sepotong-sepotong tanpa manfaat.
    void Promise.all(
      daftar.map(async (slug) => ({
        slug,
        properti: await fetchProperty(slug),
        memuat: false,
      })),
    ).then((hasil) => {
      if (!aktif) return
      setKolom(hasil)
      setMemuat(false)
    })

    return () => {
      aktif = false
    }
  }, [daftar, siap])

  const siapkah = kolom.filter((item) => item.properti !== null).map((item) => item.properti!)

  const hargaTerendah =
    siapkah.length > 1
      ? Math.min(
          ...siapkah
            .map((properti) =>
              properti.rooms.length > 0
                ? Math.min(...properti.rooms.map((room) => room.monthlyPrice))
                : Number.POSITIVE_INFINITY,
            )
            .filter((nilai) => Number.isFinite(nilai)),
        )
      : Number.POSITIVE_INFINITY

  const biayaTerendah =
    siapkah.length > 1
      ? Math.min(...siapkah.map((properti) => properti.costSummary.upfrontTotal))
      : Number.POSITIVE_INFINITY

  if (!siap) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Bandingkan kos</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {daftar.length > 0
              ? `${daftar.length} dari maksimal ${MAKS_BANDINGKAN} kos. Angka yang ditampilkan berasal dari data pemiliknya.`
              : 'Tandai kos dengan ikon timbangan di kartu atau halaman detailnya, lalu bandingkan di sini.'}
          </p>
        </div>

        {daftar.length > 0 && (
          <button
            type="button"
            onClick={bersihkan}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <X className="size-4" aria-hidden="true" />
            Kosongkan
          </button>
        )}
      </header>

      {daftar.length === 0 ? (
        <div className="mt-6">
          <EmptyRow>
            Belum ada kos yang ditandai untuk dibandingkan. Buka halaman Cari Kos, lalu tekan ikon
            timbangan pada kartu kos yang ingin Anda bandingkan.
          </EmptyRow>
          <div className="mt-4 text-center">
            <Link
              href="/kos"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
            >
              <Scale className="size-4" aria-hidden="true" />
              Cari kos
            </Link>
          </div>
        </div>
      ) : memuat && kolom.length === 0 ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Memuat data kos yang dibandingkan...
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">
              Perbandingan {daftar.length} kos berdasarkan harga, biaya, fasilitas, dan
              ketersediaan.
            </caption>

            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-44 border-b border-border p-4 text-left align-top text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Kos
                </th>

                {kolom.map((item) => (
                  <th
                    key={item.slug}
                    scope="col"
                    className="border-b border-l border-border p-4 text-left align-top"
                  >
                    {item.memuat ? (
                      <div className="h-40 animate-pulse rounded-xl bg-muted" />
                    ) : item.properti === null ? (
                      <div>
                        <p className="text-sm font-semibold">Kos tidak tersedia lagi</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          Kos ini sudah tidak bisa dibuka. Kemungkinan pemiliknya menariknya dari
                          peredaran.
                        </p>
                        <button
                          type="button"
                          onClick={() => hapus(item.slug)}
                          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          Lepas
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                          {item.properti.images[0]?.url ? (
                            <Image
                              src={item.properti.images[0].url}
                              alt={item.properti.images[0].alt}
                              fill
                              sizes="240px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="grid h-full place-items-center text-xs text-muted-foreground">
                              Foto belum tersedia
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/kos/${item.properti.slug}`}
                          className="mt-3 block text-sm font-semibold leading-snug hover:underline"
                        >
                          {item.properti.name}
                        </Link>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.properti.district}, {item.properti.city}
                        </p>

                        <button
                          type="button"
                          onClick={() => hapus(item.slug)}
                          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          Lepas
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <Baris
                label="Sewa terendah"
                keterangan="Harga kamar termurah yang terdaftar"
                kolom={kolom}
                sel={(properti) => {
                  const terendah =
                    properti.rooms.length > 0
                      ? Math.min(...properti.rooms.map((room) => room.monthlyPrice))
                      : null

                  return {
                    isi: terendah === null ? 'Belum ada kamar' : `${formatRupiah(terendah)}/bulan`,
                    tegak: true,
                    tanda: terendah !== null && terendah === hargaTerendah ? 'Termurah' : undefined,
                  }
                }}
              />

              <Baris
                label="Deposit"
                keterangan="Dikembalikan sesuai kesepakatan, bukan biaya bulanan"
                kolom={kolom}
                sel={(properti) => ({ isi: formatRupiah(properti.costSummary.depositAmount) })}
              />

              <Baris
                label="Perkiraan bulanan"
                keterangan="Sewa ditambah biaya tetap dan estimasi biaya variabel"
                kolom={kolom}
                sel={(properti) => ({
                  isi: `± ${formatRupiah(properti.costSummary.monthlyTotalEstimated)}`,
                  tegak: true,
                  catatan: COST_CONFIDENCE_LABEL[properti.costSummary.confidence],
                  nada: COST_CONFIDENCE_CLASS[properti.costSummary.confidence],
                })}
              />

              <Baris
                label="Biaya awal masuk"
                keterangan="Sewa bulan pertama, deposit, dan biaya lain di muka"
                kolom={kolom}
                sel={(properti) => ({
                  isi: `± ${formatRupiah(properti.costSummary.upfrontTotal)}`,
                  tegak: true,
                  tanda:
                    properti.costSummary.upfrontTotal === biayaTerendah ? 'Terendah' : undefined,
                })}
              />

              <Baris
                label="Tipe kos"
                kolom={kolom}
                sel={(properti) => ({
                  isi: PROPERTY_TYPE_LABEL[properti.propertyType] ?? properti.propertyType,
                })}
              />

              <Baris
                label="Kamar mandi"
                kolom={kolom}
                sel={(properti) => {
                  const jenis = Array.from(new Set(properti.rooms.map((room) => room.bathroomType)))
                  return {
                    isi:
                      jenis.length === 0
                        ? 'Belum ada kamar'
                        : jenis.map((nilai) => BATHROOM_LABEL[nilai] ?? nilai).join(', '),
                  }
                }}
              />

              <Baris
                label="Kamar"
                keterangan="Tersedia dari seluruh kamar yang terdaftar"
                kolom={kolom}
                sel={(properti) => {
                  const tersedia = properti.rooms.filter(
                    (room) => room.availabilityStatus === 'AVAILABLE',
                  ).length

                  return {
                    isi: `${formatNumber(tersedia)} dari ${formatNumber(properti.totalRooms)} tersedia`,
                    catatan: formatLastConfirmed(properti.availabilityConfirmedDaysAgo),
                    nada: properti.isAvailabilityStale
                      ? 'bg-amber-50 text-amber-700 ring-amber-200'
                      : undefined,
                  }
                }}
              />

              <Baris
                label="Fasilitas"
                kolom={kolom}
                sel={(properti) => ({
                  isi:
                    properti.facilities.length === 0
                      ? 'Belum dicantumkan'
                      : properti.facilities.map((facility) => facility.name).join(', '),
                })}
              />

              <Baris
                label="Aturan wajib"
                kolom={kolom}
                sel={(properti) => {
                  const wajib = properti.rules.filter((rule) => rule.isMandatory)
                  return {
                    isi:
                      wajib.length === 0
                        ? 'Tidak ada aturan wajib'
                        : wajib.map((rule) => rule.title).join(', '),
                  }
                }}
              />

              <Baris
                label="Verifikasi"
                keterangan="Properti diperiksa admin sebelum tayang"
                kolom={kolom}
                sel={(properti) => ({
                  lencana: properti.verificationStatus,
                })}
              />

              <Baris
                label="Alamat"
                kolom={kolom}
                sel={(properti) => ({
                  isi: `${properti.address}, ${properti.district}, ${properti.city}`,
                })}
              />

              <Baris
                label="Pemilik"
                kolom={kolom}
                sel={(properti) => ({
                  isi: properti.owner.businessName ?? properti.owner.name,
                  catatan: properti.owner.verified
                    ? 'Identitas terverifikasi'
                    : 'Verifikasi identitas dalam proses',
                })}
              />
            </tbody>
          </table>
        </div>
      )}

      {daftar.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/kos"
            className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Tambah kos lain
          </Link>

          {daftar.length < MAKS_BANDINGKAN && (
            <p className="text-xs text-muted-foreground">
              Masih bisa menambahkan {MAKS_BANDINGKAN - daftar.length} kos lagi.
            </p>
          )}
        </div>
      )}

      {siapkah.length > 1 && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Angka berlabel &ldquo;perkiraan&rdquo; berasal dari komponen biaya yang dicatat pemilik,
          dan yang belum dikonfirmasi ditandai apa adanya. Konfirmasi dulu ke pemilik sebelum
          memutuskan.
        </p>
      )}
    </div>
  )
}

/**
 * Satu baris perbandingan.
 *
 * Bentuk selnya ditentukan fungsi `sel`, bukan satu bentuk seragam, karena
 * sebagian baris memang butuh lencana status dan sebagian lain butuh penanda
 * "termurah". Menyeragamkannya jadi teks saja akan membuang keterangan yang
 * justru alasan pembaca membuka halaman ini.
 */
function Baris({
  label,
  keterangan,
  kolom,
  sel,
}: {
  label: string
  keterangan?: string
  kolom: Kolom[]
  sel: (properti: PropertyDetail) => {
    isi?: string
    tegak?: boolean
    catatan?: string | null
    nada?: string
    tanda?: string
    lencana?: string
  }
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="p-4 text-left align-top">
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        {keterangan && (
          <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-muted-foreground">
            {keterangan}
          </span>
        )}
      </th>

      {kolom.map((item) => (
        <td key={item.slug} className="border-l border-border p-4 align-top">
          {item.memuat ? (
            <span className="block h-4 w-24 animate-pulse rounded bg-muted" />
          ) : item.properti === null ? (
            <span className="text-xs text-muted-foreground">Tidak tersedia</span>
          ) : (
            (() => {
              const hasil = sel(item.properti)

              return (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {hasil.lencana ? (
                      <StatusBadge status={hasil.lencana} jenis="verifikasi" />
                    ) : (
                      <span
                        className={cn(
                          'text-sm leading-relaxed',
                          hasil.tegak ? 'font-semibold' : 'text-foreground',
                        )}
                      >
                        {hasil.isi}
                      </span>
                    )}

                    {hasil.tanda && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        {hasil.tanda}
                      </span>
                    )}
                  </div>

                  {hasil.catatan && (
                    <p
                      className={cn(
                        'text-[11px] leading-relaxed',
                        hasil.nada ? 'w-fit rounded-md px-1.5 py-0.5 ring-1' : 'text-muted-foreground',
                        hasil.nada,
                      )}
                    >
                      {hasil.catatan}
                    </p>
                  )}
                </div>
              )
            })()
          )}
        </td>
      ))}
    </tr>
  )
}
