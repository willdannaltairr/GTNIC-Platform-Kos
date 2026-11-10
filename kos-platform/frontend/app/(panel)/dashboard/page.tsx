'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Building2,
  ClipboardList,
  DoorOpen,
  HandCoins,
  MessageSquare,
  Receipt,
  Star,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import {
  fetchDashboardOwner,
  fetchDashboardTenant,
  type DashboardOwner,
  type DashboardTenant,
} from '@/lib/dashboard'
import { fetchRingkasanKeuangan, type RingkasanKeuangan } from '@/lib/expenses'
import { fetchNotifications, type Notifikasi } from '@/lib/notifications'
import {
  BarisAktivitas,
  EmptyRow,
  GrafikArea,
  ProgresBar,
  StatKartu,
  StatusBadge,
} from '@/components/dashboard/kit'
import { formatRupiah, formatRupiahRingkas, formatTanggal } from '@/lib/format'

/** Nama bulan pendek untuk sumbu grafik: "2026-11" menjadi "Nov". */
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const labelBulan = (bulan: string): string => {
  const bagian = bulan.split('-')
  const indeks = Number(bagian[1]) - 1
  return NAMA_BULAN[indeks] ?? bulan
}

/**
 * Ikon per jenis notifikasi.
 *
 * Yang tidak ada di peta ini tetap tampil dengan lonceng, bukan disembunyikan:
 * jenis baru dari backend harus terlihat apa adanya supaya ketahuan bahwa
 * petanya perlu ditambah.
 */
const IKON_NOTIFIKASI: Record<string, LucideIcon> = {
  NEW_BOOKING: ClipboardList,
  BOOKING_APPROVED: ClipboardList,
  BOOKING_REJECTED: ClipboardList,
  NEW_INVOICE: Receipt,
  INVOICE_DUE_SOON: Receipt,
  PAYMENT_SUCCESS: HandCoins,
  PAYMENT_RECEIVED: HandCoins,
  NEW_MAINTENANCE_REPORT: Wrench,
  MAINTENANCE_UPDATED: Wrench,
  NEW_MESSAGE: MessageSquare,
  REVIEW_APPROVED: Star,
  REVIEW_REJECTED: Star,
  NEW_REPORT: Wrench,
  NEW_COMPLAINT: Wrench,
}

/**
 * Rentang bulan kontrak yang sudah berjalan, untuk batang kemajuan sewa.
 *
 * Dihitung dari selisih bulan kalender, bukan jumlah hari dibagi tiga puluh:
 * sewa bulanan dihitung per bulan, dan pembagian hari menghasilkan angka yang
 * tidak cocok dengan tagihan yang sebenarnya.
 */
const progresKontrak = (
  mulai: string | null,
  selesai: string | null,
): { nilai: number; teks: string } => {
  if (!mulai) return { nilai: 0, teks: 'Tanggal mulai belum ditetapkan' }

  const awal = new Date(mulai)
  const sekarang = new Date()

  if (!selesai) {
    return awal > sekarang
      ? { nilai: 0, teks: `Mulai ${formatTanggal(mulai)}` }
      : { nilai: 0, teks: `Berjalan sejak ${formatTanggal(mulai)}, selesai belum ditetapkan` }
  }

  const akhir = new Date(selesai)
  const bulanAntara = (a: Date, b: Date): number =>
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())

  const total = Math.max(1, bulanAntara(awal, akhir))
  const jalan = Math.min(total, Math.max(0, bulanAntara(awal, sekarang)))

  return {
    nilai: (jalan / total) * 100,
    teks: `${jalan} dari ${total} bulan`,
  }
}

/**
 * Ringkasan panel, untuk kedua peran.
 *
 * Isinya ditentukan peran yang tersimpan di token: penghuni melihat sewa dan
 * tagihannya, pemilik kos melihat properti, kamar, dan uangnya. Peran dibaca
 * dari sesi yang sudah divalidasi ke API, bukan dari halaman terpisah yang bisa
 * dibuka siapa saja.
 *
 * Susunannya mengikuti kebiasaan halaman ringkasan: empat angka terpenting di
 * atas, satu grafik besar, lalu dua kartu berisi daftar. Yang paling sering
 * ditanya pemilik adalah "berapa yang belum bayar", jadi angka itu selalu ada
 * di kartu statistik, bukan tersembunyi di halaman lain.
 */
export default function DashboardPage() {
  const { user, status } = useSession()
  const [tenant, setTenant] = useState<DashboardTenant | null>(null)
  const [owner, setOwner] = useState<DashboardOwner | null>(null)
  const [keuangan, setKeuangan] = useState<RingkasanKeuangan | null>(null)
  const [aktivitas, setAktivitas] = useState<Notifikasi[]>([])
  const [siap, setSiap] = useState(false)

  const pemilik = user?.role === 'OWNER' || user?.role === 'ADMIN'

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    const ambil = pemilik
      ? Promise.all([
          fetchDashboardOwner(),
          fetchRingkasanKeuangan(6),
          fetchNotifications({ limit: 6 }),
        ])
      : Promise.all([fetchDashboardTenant(), fetchNotifications({ limit: 6 })])

    void ambil.then((hasil) => {
      if (!aktif) return

      if (pemilik) {
        const [papan, rangkuman, notifikasi] = hasil as [
          DashboardOwner | null,
          RingkasanKeuangan | null,
          Awaited<ReturnType<typeof fetchNotifications>>,
        ]
        setOwner(papan)
        setKeuangan(rangkuman)
        setAktivitas(notifikasi?.items ?? [])
      } else {
        const [papan, notifikasi] = hasil as [
          DashboardTenant | null,
          Awaited<ReturnType<typeof fetchNotifications>>,
        ]
        setTenant(papan)
        setAktivitas(notifikasi?.items ?? [])
      }

      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, pemilik])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Masuk untuk membuka panel
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Panel berisi sewa, tagihan, dan permintaan perbaikan milik akun Anda.
        </p>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {pemilik ? (
        <TampilanPemilik data={owner} keuangan={keuangan} aktivitas={aktivitas} />
      ) : (
        <TampilanPenghuni
          data={tenant}
          aktivitas={aktivitas}
          namaDepan={user.full_name.split(/\s+/)[0]}
        />
      )}
    </div>
  )
}

/** Ringkasan untuk pemilik kos. */
function TampilanPemilik({
  data,
  keuangan,
  aktivitas,
}: {
  data: DashboardOwner | null
  keuangan: RingkasanKeuangan | null
  aktivitas: Notifikasi[]
}) {
  if (!data) {
    return (
      <EmptyRow>
        Panel belum bisa dimuat. Pastikan layanan API berjalan, lalu muat ulang halaman.
      </EmptyRow>
    )
  }

  const r = data.ringkasan
  const terisi = r.kamar > 0 ? Math.round((r.kamarTerisi / r.kamar) * 100) : 0

  const titikGrafik =
    keuangan?.bulanan.map((bulan) => ({
      label: labelBulan(bulan.bulan),
      utama: bulan.pemasukan,
      pembanding: bulan.pengeluaran,
    })) ?? []

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatKartu
          label="Properti"
          value={r.properti}
          hint={`${r.propertiTerverifikasi} sudah terverifikasi`}
          icon={Building2}
        />
        <StatKartu
          label="Kamar terisi"
          value={`${r.kamarTerisi}/${r.kamar}`}
          hint={`${terisi}% terisi, ${r.kamarTersedia} kamar kosong`}
          icon={DoorOpen}
        />
        <StatKartu
          label="Tagihan belum dibayar"
          value={r.tagihanBelumDibayar}
          hint={
            r.totalTagihanBelumDibayar > 0
              ? `${formatRupiah(r.totalTagihanBelumDibayar)} belum masuk`
              : 'Tidak ada tunggakan'
          }
          icon={Receipt}
        />
        <StatKartu
          label="Pendapatan bulan ini"
          value={formatRupiahRingkas(r.pendapatanBulanIni)}
          hint="Dari tagihan yang sudah lunas"
          icon={HandCoins}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">Uang masuk dan keluar</h2>
          <p className="text-xs text-muted-foreground">Enam bulan terakhir</p>
        </div>

        {titikGrafik.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Ringkasan keuangan belum bisa dimuat, jadi grafiknya belum bisa digambar.
          </p>
        ) : (
          <div className="mt-4">
            <GrafikArea
              titik={titikGrafik}
              labelUtama="Pemasukan"
              labelPembanding="Pengeluaran"
              format={formatRupiahRingkas}
            />
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Kamar terisi per properti</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Berapa banyak kamar yang sudah berpenghuni di tiap kos Anda.
          </p>

          <div className="mt-5 flex flex-col gap-5">
            {data.properti.length === 0 ? (
              <EmptyRow>
                Belum ada properti. Properti muncul di sini setelah Anda mendaftarkannya.
              </EmptyRow>
            ) : (
              data.properti.slice(0, 6).map((properti) => (
                <ProgresBar
                  key={properti.id}
                  label={properti.name}
                  keterangan={properti.city}
                  nilai={
                    properti.totalRooms > 0
                      ? (properti.occupiedRooms / properti.totalRooms) * 100
                      : 0
                  }
                  teks={
                    properti.totalRooms > 0
                      ? `${properti.occupiedRooms}/${properti.totalRooms} kamar`
                      : 'Belum ada kamar'
                  }
                />
              ))
            )}
          </div>

          <Link
            href="/dashboard/kamar"
            className="mt-5 inline-flex text-sm font-medium text-primary transition-colors hover:text-primary-strong"
          >
            Lihat status bayar tiap kamar
          </Link>
        </section>

        <Aktivitas items={aktivitas} />
      </div>
    </>
  )
}

/** Ringkasan untuk penghuni atau pencari kos. */
function TampilanPenghuni({
  data,
  aktivitas,
  namaDepan,
}: {
  data: DashboardTenant | null
  aktivitas: Notifikasi[]
  namaDepan: string
}) {
  if (!data) {
    return (
      <EmptyRow>
        Panel belum bisa dimuat. Pastikan layanan API berjalan, lalu muat ulang halaman.
      </EmptyRow>
    )
  }

  const r = data.ringkasan

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatKartu label="Sewa aktif" value={r.sewaAktif} hint="Kontrak yang sedang berjalan" icon={DoorOpen} />
        <StatKartu
          label="Booking menunggu"
          value={r.bookingMenunggu}
          hint="Menunggu keputusan pemilik"
          icon={ClipboardList}
        />
        <StatKartu
          label="Tagihan belum dibayar"
          value={r.tagihanBelumDibayar}
          hint={
            r.totalTagihanBelumDibayar > 0
              ? `${formatRupiah(r.totalTagihanBelumDibayar)} perlu dibayar`
              : 'Tidak ada tagihan'
          }
          icon={Receipt}
        />
        <StatKartu
          label="Perbaikan terbuka"
          value={r.perbaikanTerbuka}
          hint="Laporan Anda yang belum selesai"
          icon={Wrench}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">Progres sewa Anda</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Berjalan sejak tanggal masuk sampai akhir masa sewa.
          </p>

          <div className="mt-5 flex flex-col gap-5">
            {data.sewa.length === 0 ? (
              <EmptyRow>
                Belum ada sewa aktif, {namaDepan}. Kontrak muncul di sini setelah pemilik
                menyetujui booking Anda.
              </EmptyRow>
            ) : (
              data.sewa.map((item) => {
                const progres = progresKontrak(item.startDate, item.endDate)

                return (
                  <ProgresBar
                    key={item.id}
                    label={`${item.propertyName}, kamar ${item.roomNumber}`}
                    keterangan={`${formatRupiah(item.monthlyRent)} per bulan`}
                    nilai={progres.nilai}
                    teks={progres.teks}
                  />
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight">Tagihan menunggu</h2>
            <Link href="/tagihan" className="text-xs font-medium text-primary hover:text-primary-strong">
              Semua tagihan
            </Link>
          </div>

          <div className="mt-4">
            {data.tagihan.length === 0 ? (
              <EmptyRow>Tidak ada tagihan yang menunggu pembayaran.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {data.tagihan.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.invoiceNumber}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.propertyName}, kamar {item.roomNumber} · jatuh tempo{' '}
                        {formatTanggal(item.dueDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatRupiah(item.totalAmount)}
                      </span>
                      <StatusBadge status={item.status} jenis="invoice" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6">
        <Aktivitas items={aktivitas} />
      </div>
    </>
  )
}

/** Kartu aktivitas terbaru dari notifikasi akun. */
function Aktivitas({ items }: { items: Notifikasi[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">Aktivitas terbaru</h2>
        <Link href="/notifikasi" className="text-xs font-medium text-primary hover:text-primary-strong">
          Semua notifikasi
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Belum ada aktivitas. Pemberitahuan booking, tagihan, dan laporan akan muncul di sini.
        </p>
      ) : (
        <ol className="mt-5 flex flex-col gap-4">
          {items.map((item) => (
            <BarisAktivitas
              key={item.id}
              judul={item.title}
              pesan={item.message}
              waktu={formatTanggal(item.createdAt)}
              icon={IKON_NOTIFIKASI[item.type] ?? Bell}
              belumDibaca={!item.isRead}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
