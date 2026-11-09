'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/session/session-provider'
import {
  fetchDashboardOwner,
  fetchDashboardTenant,
  type DashboardOwner,
  type DashboardTenant,
} from '@/lib/dashboard'
import { EmptyRow, Panel, StatCard, StatusBadge } from '@/components/dashboard/kit'
import { formatRupiah, formatTanggal } from '@/lib/format'

/**
 * Dashboard pengguna.
 *
 * Isinya ditentukan peran yang tersimpan di token: penghuni melihat sewa dan
 * tagihannya, pemilik kos melihat properti dan booking yang menunggu
 * tindakannya. Peran dibaca dari sesi yang sudah divalidasi ke API, bukan dari
 * halaman terpisah yang bisa dibuka siapa saja.
 */
export default function DashboardPage() {
  const { user, status } = useSession()
  const [tenant, setTenant] = useState<DashboardTenant | null>(null)
  const [owner, setOwner] = useState<DashboardOwner | null>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'

    const ambil = pemilik ? fetchDashboardOwner() : fetchDashboardTenant()

    void ambil.then((hasil) => {
      if (!aktif) return
      if (pemilik) setOwner(hasil as DashboardOwner | null)
      else setTenant(hasil as DashboardTenant | null)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka dashboard</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dashboard berisi sewa, tagihan, dan permintaan perbaikan milik akun Anda.
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

  const namaDepan = user.full_name.split(/\s+/)[0]
  const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Halo, {namaDepan}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {pemilik
              ? 'Ringkasan properti, booking, dan tagihan yang perlu tindakan Anda.'
              : 'Ringkasan sewa, tagihan, dan permintaan perbaikan Anda.'}
          </p>
        </div>

        <Link
          href={pemilik ? '/kos' : '/beranda'}
          className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          {pemilik ? 'Lihat daftar kos' : 'Cari kos'}
        </Link>
      </header>

      {pemilik ? <TampilanPemilik data={owner} /> : <TampilanPenghuni data={tenant} />}
    </div>
  )
}

/** Dashboard penghuni atau pencari kos. */
function TampilanPenghuni({ data }: { data: DashboardTenant | null }) {
  if (!data) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
        Dashboard belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
      </p>
    )
  }

  const r = data.ringkasan

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Sewa aktif" value={r.sewaAktif} />
        <StatCard label="Booking menunggu" value={r.bookingMenunggu} hint="Menunggu keputusan pemilik" />
        <StatCard
          label="Tagihan belum dibayar"
          value={r.tagihanBelumDibayar}
          hint={r.totalTagihanBelumDibayar > 0 ? formatRupiah(r.totalTagihanBelumDibayar) : undefined}
        />
        <StatCard label="Perbaikan terbuka" value={r.perbaikanTerbuka} />
        <StatCard label="Kos favorit" value={r.favorit} />
        <StatCard label="Kunjungan terjadwal" value={r.kunjunganTerjadwal} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Sewa aktif" description="Kontrak yang sedang berjalan.">
          {data.sewa.length === 0 ? (
            <EmptyRow>Belum ada sewa aktif. Kontrak muncul di sini setelah pemilik menyetujui booking Anda.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.sewa.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.propertyName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Kamar {item.roomNumber} · {formatTanggal(item.startDate)} sampai{' '}
                      {item.endDate ? formatTanggal(item.endDate) : 'selesai'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatRupiah(item.monthlyRent)}</span>
                    <StatusBadge status={item.status} jenis="kontrak" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Tagihan belum dibayar" description="Diurutkan dari jatuh tempo terdekat.">
          {data.tagihan.length === 0 ? (
            <EmptyRow>Tidak ada tagihan yang menunggu pembayaran.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.tagihan.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.invoiceNumber}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.propertyName}, kamar {item.roomNumber} · jatuh tempo{' '}
                      {formatTanggal(item.dueDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatRupiah(item.totalAmount)}</span>
                    <StatusBadge status={item.status} jenis="invoice" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Perbaikan terbuka" description="Laporan yang belum selesai ditangani.">
          {data.perbaikan.length === 0 ? (
            <EmptyRow>Belum ada laporan perbaikan yang terbuka.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.perbaikan.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/perbaikan/${item.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.propertyName}, kamar {item.roomNumber} · {formatTanggal(item.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.priority} jenis="prioritas" />
                    <StatusBadge status={item.status} jenis="perbaikan" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Kunjungan terjadwal" description="Jadwal survei kos yang sudah Anda tetapkan.">
          {data.kunjungan.length === 0 ? (
            <EmptyRow>Belum ada kunjungan terjadwal.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.kunjungan.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.propertyName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTanggal(item.scheduledAt)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} jenis="kunjungan" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}

/** Dashboard pemilik kos. */
function TampilanPemilik({ data }: { data: DashboardOwner | null }) {
  if (!data) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
        Dashboard belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
      </p>
    )
  }

  const r = data.ringkasan

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Properti"
          value={r.properti}
          hint={`${r.propertiTerverifikasi} sudah terverifikasi`}
        />
        <StatCard
          label="Kamar"
          value={r.kamar}
          hint={`${r.kamarTersedia} tersedia, ${r.kamarTerisi} terisi`}
        />
        <StatCard label="Booking menunggu" value={r.bookingMenunggu} hint="Perlu keputusan Anda" />
        <StatCard
          label="Tagihan belum dibayar"
          value={r.tagihanBelumDibayar}
          hint={r.totalTagihanBelumDibayar > 0 ? formatRupiah(r.totalTagihanBelumDibayar) : undefined}
        />
        <StatCard label="Perbaikan terbuka" value={r.perbaikanTerbuka} />
        <StatCard
          label="Pendapatan bulan ini"
          value={formatRupiah(r.pendapatanBulanIni)}
          hint="Dari tagihan berstatus lunas bulan berjalan"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Properti saya" description="Terbaru lebih dulu.">
          {data.properti.length === 0 ? (
            <EmptyRow>Belum ada properti. Properti muncul setelah Anda mendaftarkannya.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.properti.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/kos/${item.slug}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.city} · {item.availableRooms} dari {item.totalRooms} kamar tersedia
                      {item.minMonthlyPrice !== null
                        ? ` · mulai ${formatRupiah(item.minMonthlyPrice)}`
                        : ''}
                    </p>
                  </div>

                  <StatusBadge
                    status={item.verificationStatus}
                    jenis="booking"
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Booking menunggu" description="Calon penghuni yang menunggu jawaban Anda.">
          {data.booking.length === 0 ? (
            <EmptyRow>Tidak ada booking yang menunggu keputusan.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.booking.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.tenantName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.propertyName}, kamar {item.roomNumber} · masuk{' '}
                      {formatTanggal(item.checkInDate)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} jenis="booking" />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Tagihan belum dibayar" description="Diurutkan dari jatuh tempo terdekat.">
          {data.tagihan.length === 0 ? (
            <EmptyRow>Semua tagihan penghuni sudah lunas.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.tagihan.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.invoiceNumber}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.tenantName} · {item.propertyName}, kamar {item.roomNumber} · jatuh tempo{' '}
                      {formatTanggal(item.dueDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatRupiah(item.totalAmount)}</span>
                    <StatusBadge status={item.status} jenis="invoice" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Perbaikan terbuka" description="Laporan penghuni yang belum selesai.">
          {data.perbaikan.length === 0 ? (
            <EmptyRow>Tidak ada laporan perbaikan yang terbuka.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.perbaikan.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/perbaikan/${item.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.propertyName}, kamar {item.roomNumber} · {formatTanggal(item.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.priority} jenis="prioritas" />
                    <StatusBadge status={item.status} jenis="perbaikan" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
