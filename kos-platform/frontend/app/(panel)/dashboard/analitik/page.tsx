'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Building2, DoorOpen, FileText, Loader2, TrendingUp, Wrench } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, GrafikArea, Panel, ProgresBar, StatKartu } from '@/components/dashboard/kit'
import { fetchAnalitikOwner, type AnalitikPemilik } from '@/lib/analytics'
import { TOMBOL_SEKUNDER } from '@/components/site/kerangka'
import { formatNumber, formatRupiah, formatRupiahRingkas } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Nama bulan pendek untuk sumbu grafik: "2026-11" menjadi "Nov". */
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const labelBulan = (bulan: string): string => {
  const bagian = bulan.split('-')
  return NAMA_BULAN[Number(bagian[1]) - 1] ?? bulan
}

/** Rentang bulan yang bisa dipilih. Sama dengan batas di backend. */
const RENTANG = [3, 6, 12] as const

/**
 * Analitik pemilik kos.
 *
 * Halaman ini menjawab pertanyaan yang tidak dijawab ringkasan harian: apakah
 * usaha kosnya membaik atau memburuk, kamar mana yang menganggur, dan berapa
 * uang yang belum masuk. Karena itu isinya deret waktu dan perbandingan antar
 * properti, bukan daftar pekerjaan hari ini.
 *
 * Yang ditampilkan hanya data yang sudah ada di database. Tidak ada satu pun
 * angka yang dibulatkan ke atas agar terlihat lebih baik, dan bulan yang belum
 * punya data tetap muncul bernilai nol supaya garisnya tidak melompat.
 *
 * Perbandingan bulan ini dengan bulan lalu ditulis apa adanya, termasuk saat
 * bulan lalu nol: di keadaan itu halaman menulis "belum ada pembanding", bukan
 * persentase tak terhingga yang terbaca seperti pertumbuhan luar biasa.
 */
export default function AnalitikPage() {
  const { user, status } = useSession()
  const [data, setData] = useState<AnalitikPemilik | null>(null)
  const [siap, setSiap] = useState(false)
  const [bulan, setBulan] = useState<number>(6)

  const pemilik = user?.role === 'OWNER' || user?.role === 'ADMIN'

  const muat = useCallback(async (jumlahBulan: number): Promise<void> => {
    setData(await fetchAnalitikOwner(jumlahBulan))
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    // Tamu dan penghuni tidak punya apa pun untuk dilihat di sini. Halaman
    // berhenti di keadaan siap dengan data kosong, dan yang tampil adalah
    // penjelasan, bukan kerangka pemuatan yang berputar selamanya.
    if (status === 'tamu' || !user || !pemilik) {
      setSiap(true)
      return
    }

    void fetchAnalitikOwner(bulan).then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, pemilik, bulan])

  const gantiRentang = (nilai: number): void => {
    setBulan(nilai)
    setSiap(false)
    void muat(nilai).then(() => setSiap(true))
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-7 w-52 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="mt-5 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!pemilik) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyRow>
          Halaman ini berisi analitik pemilik kos. Masuk dengan akun pemilik untuk melihatnya.
        </EmptyRow>
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyRow>
          Analitik belum bisa dimuat. Pastikan layanan API berjalan, lalu muat ulang halaman.
        </EmptyRow>
      </div>
    )
  }

  const r = data.ringkasan
  const t = data.tagihan
  const b = data.booking

  const titikGrafik = data.deret.map((item) => ({
    label: labelBulan(item.bulan),
    utama: item.diterima,
    pembanding: item.ditagihkan,
  }))

  // Jumlah tagihan yang perlu ditindaklanjuti. Dipakai sebagai keterangan, bukan
  // sebagai angka besar: yang menentukan tindakan adalah umurnya, bukan jumlahnya.
  const terlambat = t.lewat1Sampai7 + t.lewat8Sampai30 + t.lewatLebih30

  const rasioDisetujui = b.diajukan > 0 ? Math.round((b.disetujui / b.diajukan) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Analitik</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Keadaan kos Anda dalam angka: hunian, uang yang masuk dan yang ditagihkan, umur
            tagihan, dan berapa pengajuan sewa yang berakhir jadi penyewa. Semuanya dihitung dari
            data yang sudah tercatat.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {RENTANG.map((nilai) => (
            <button
              key={nilai}
              type="button"
              onClick={() => gantiRentang(nilai)}
              aria-pressed={bulan === nilai}
              className={cn(
                'h-9 rounded-full border px-3.5 text-sm font-medium tabular-nums transition-colors',
                bulan === nilai
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/40',
              )}
            >
              {nilai} bulan
            </button>
          ))}
        </div>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatKartu
          label="Tingkat hunian"
          value={`${r.tingkatHunian}%`}
          hint={`${formatNumber(r.kamarTerisi)} dari ${formatNumber(r.kamar)} kamar terisi, ${formatNumber(r.kamarTersedia)} masih kosong`}
          icon={DoorOpen}
        />

        <StatKartu
          label="Pendapatan bulan ini"
          value={formatRupiahRingkas(r.pendapatanBulanIni)}
          hint={
            r.perubahanPendapatan === null
              ? 'Bulan lalu belum ada pemasukan, jadi belum ada pembanding'
              : `${r.perubahanPendapatan >= 0 ? 'Naik' : 'Turun'} ${Math.abs(r.perubahanPendapatan)}% dari bulan lalu (${formatRupiahRingkas(r.pendapatanBulanLalu)})`
          }
          icon={TrendingUp}
        />

        <StatKartu
          label="Tagihan belum lunas"
          value={formatRupiahRingkas(t.totalBelumLunas)}
          hint={
            terlambat > 0
              ? `${formatNumber(terlambat)} dari ${formatNumber(t.jumlahBelumLunas)} tagihan sudah lewat jatuh tempo`
              : `${formatNumber(t.jumlahBelumLunas)} tagihan, belum ada yang lewat jatuh tempo`
          }
          icon={FileText}
        />

        <StatKartu
          label="Pengajuan sewa 30 hari"
          value={formatNumber(b.diajukan)}
          hint={`${formatNumber(b.disetujui)} disetujui, ${formatNumber(b.ditolak)} ditolak, ${formatNumber(b.batal)} batal`}
          icon={Building2}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={`Uang masuk dan yang ditagihkan, ${bulan} bulan terakhir`}
          description="Garis penuh adalah uang yang benar-benar diterima. Garis putus-putus adalah tagihan yang diterbitkan pada bulan itu, dibayar atau belum."
        >
          {titikGrafik.length === 0 ? (
            <EmptyRow>Belum ada data tagihan pada rentang ini.</EmptyRow>
          ) : (
            <GrafikArea
              titik={titikGrafik}
              labelUtama="Diterima"
              labelPembanding="Ditagihkan"
              format={formatRupiahRingkas}
            />
          )}
        </Panel>

        <Panel
          title="Umur tagihan"
          description="Terlambat tiga hari dan terlambat tiga bulan perlu tindakan yang berbeda, jadi keduanya dipisah."
        >
          {t.jumlahBelumLunas === 0 ? (
            <EmptyRow>Tidak ada tagihan yang menunggu pembayaran.</EmptyRow>
          ) : (
            <div className="flex flex-col gap-5">
              <ProgresBar
                label="Belum jatuh tempo"
                keterangan="Masih dalam tenggat, belum perlu ditagih"
                nilai={t.belumJatuhTempo === 0 ? 0 : (t.belumJatuhTempo / t.jumlahBelumLunas) * 100}
                teks={`${formatNumber(t.belumJatuhTempo)} tagihan`}
              />

              <ProgresBar
                label="Lewat 1 sampai 7 hari"
                keterangan="Pengingat pertama masih sopan di rentang ini"
                nilai={(t.lewat1Sampai7 / t.jumlahBelumLunas) * 100}
                teks={`${formatNumber(t.lewat1Sampai7)} tagihan`}
              />

              <ProgresBar
                label="Lewat 8 sampai 30 hari"
                keterangan="Sudah perlu ditanyakan langsung, bukan sekadar diingatkan"
                nilai={(t.lewat8Sampai30 / t.jumlahBelumLunas) * 100}
                teks={`${formatNumber(t.lewat8Sampai30)} tagihan`}
              />

              <ProgresBar
                label="Lewat lebih dari 30 hari"
                keterangan="Perlu kesepakatan ulang atau tindakan lanjutan"
                nilai={(t.lewatLebih30 / t.jumlahBelumLunas) * 100}
                teks={`${formatNumber(t.lewatLebih30)} tagihan`}
              />

              <Link href="/dashboard/kalender" className={cn(TOMBOL_SEKUNDER, 'w-full')}>
                Buka kalender jatuh tempo
              </Link>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Hunian per properti"
          description="Kamar perawatan dihitung sebagai kamar yang tidak terisi, karena selama diperbaiki memang tidak bisa disewakan."
        >
          {data.properti.length === 0 ? (
            <EmptyRow>Belum ada properti yang terdaftar.</EmptyRow>
          ) : (
            <ul className="flex flex-col gap-5">
              {data.properti.map((properti) => (
                <li key={properti.id}>
                  <ProgresBar
                    label={properti.name}
                    keterangan={
                      properti.rooms === 0
                        ? `${properti.city} · kamarnya belum ditambahkan, jadi huniannya belum bisa dihitung`
                        : `${properti.city} · ${formatNumber(properti.occupied)} terisi, ${formatNumber(properti.available)} kosong${
                            properti.maintenance > 0
                              ? `, ${formatNumber(properti.maintenance)} diperbaiki`
                              : ''
                          } · sewa terisi ${formatRupiah(properti.nilaiTerisi)} per bulan`
                    }
                    nilai={properti.tingkatHunian}
                    teks={properti.rooms === 0 ? '-' : `${properti.tingkatHunian}%`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Perbaikan dan pengajuan sewa"
          description="Lamanya penyelesaian dihitung dari laporan dibuat sampai statusnya ditutup."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Wrench className="size-3.5" aria-hidden="true" />
                Perbaikan
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatNumber(data.perbaikan.terbuka)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                masih terbuka dari {formatNumber(data.perbaikan.total)} laporan sepanjang waktu.
                {data.perbaikan.rataHariSelesai !== null &&
                  ` Rata-rata selesai ${data.perbaikan.rataHariSelesai} hari.`}
                {data.perbaikan.selesai90Hari > 0 &&
                  ` ${formatNumber(data.perbaikan.selesai90Hari)} selesai dalam 90 hari terakhir.`}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <FileText className="size-3.5" aria-hidden="true" />
                Pengajuan sewa
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{rasioDisetujui}%</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                dari {formatNumber(b.diajukan)} pengajuan 30 hari terakhir berakhir jadi penyewa,
                termasuk yang masih menunggu pembayaran dan tanda tangan.
              </p>
            </div>
          </div>

          {b.diajukan === 0 && (
            <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Belum ada pengajuan sewa dalam 30 hari terakhir. Kalau propertinya sudah terbit dan
                terverifikasi, yang biasanya menahan pengajuan adalah harga yang tidak dicantumkan
                atau ketersediaan yang lama tidak dikonfirmasi.
              </span>
            </p>
          )}
        </Panel>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Angka di halaman ini dihitung ulang setiap kali halaman dibuka, langsung dari tagihan,
        pembayaran, dan laporan yang tercatat. Karena itu angkanya selalu sama dengan yang Anda
        lihat di daftar tagihan dan kamar, tanpa ada ringkasan tersendiri yang bisa berbeda.
      </p>
    </div>
  )
}
