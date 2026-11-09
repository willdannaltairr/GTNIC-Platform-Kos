'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatCard, StatusBadge } from '@/components/dashboard/kit'
import {
  fetchAktivitasAdmin,
  fetchPropertiAdmin,
  fetchRingkasanAdmin,
  type AktivitasAdmin,
  type PropertiAdmin,
  type RingkasanAdmin,
} from '@/lib/admin'
import { formatRupiah, formatTanggal } from '@/lib/format'

/**
 * Dashboard admin.
 *
 * Isinya baru dimuat setelah sesi terbukti berperan ADMIN. Memuatnya lebih
 * dulu hanya menghasilkan tiga permintaan yang pasti ditolak server, dan
 * halaman yang menampilkan "gagal dimuat" padahal sebabnya bukan kegagalan.
 */
export default function AdminDashboardPage() {
  const { user, status } = useSession()
  const [ringkasan, setRingkasan] = useState<RingkasanAdmin | null>(null)
  const [properti, setProperti] = useState<PropertiAdmin[] | null>(null)
  const [aktivitas, setAktivitas] = useState<AktivitasAdmin[] | null>(null)
  const [siap, setSiap] = useState(false)

  const admin = user?.role === 'ADMIN'

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || user.role !== 'ADMIN') {
      setSiap(true)
      return
    }

    void Promise.all([
      fetchRingkasanAdmin(),
      fetchPropertiAdmin({ status: 'UNDER_REVIEW' }),
      fetchAktivitasAdmin(5),
    ]).then(([r, p, a]) => {
      if (!aktif) return
      setRingkasan(r)
      setProperti(p)
      setAktivitas(a)
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka panel admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Panel ini hanya untuk akun admin platform.
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

  if (!admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Halaman ini untuk admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Akun Anda bukan admin platform. Pengelolaan properti untuk pemilik ada di halaman
          Properti saya.
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Panel admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ringkasan platform, properti yang menunggu ditinjau, dan aktivitas terakhir.
        </p>

        {/* Navigasi antar bagian panel: ketiganya pekerjaan yang berbeda, dan
            tanpa daftar ini bagian yang tidak disebut di halaman ini hanya bisa
            ditemukan dari mengingat alamatnya. */}
        <nav aria-label="Bagian panel admin" className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Moderasi properti', href: '/admin/properti' },
            { label: 'Moderasi ulasan', href: '/admin/ulasan' },
            { label: 'Verifikasi pemilik', href: '/admin/pemilik' },
            { label: 'Pengguna', href: '/admin/pengguna' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {ringkasan === null ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          Ringkasan belum bisa dimuat. Pastikan server API berjalan, lalu muat ulang halaman.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pengguna"
            value={ringkasan.totalPengguna}
            hint={`${ringkasan.penggunaAktif} aktif, ${ringkasan.totalPemilik} pemilik`}
          />
          <StatCard
            label="Properti"
            value={ringkasan.totalProperti}
            hint={`${ringkasan.propertiMenungguVerifikasi} menunggu ditinjau`}
          />
          <StatCard
            label="Booking"
            value={ringkasan.totalBooking}
            hint={`${ringkasan.bookingBulanIni} bulan ini`}
          />
          <StatCard
            label="Transaksi lunas"
            value={ringkasan.totalTransaksi}
            hint={ringkasan.nilaiTransaksi > 0 ? formatRupiah(ringkasan.nilaiTransaksi) : 'Belum ada'}
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Menunggu ditinjau"
          description="Properti yang pemiliknya sudah mengajukan verifikasi."
        >
          {properti === null ? (
            <EmptyRow>Daftar properti belum bisa dimuat.</EmptyRow>
          ) : properti.length === 0 ? (
            <EmptyRow>Tidak ada properti yang menunggu ditinjau.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {properti.slice(0, 5).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/properti/${item.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.city} · {item.ownerName} · {item.totalRooms} kamar
                    </p>
                  </div>
                  <StatusBadge status={item.verificationStatus} jenis="verifikasi" />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <Link
              href="/admin/properti"
              className="text-sm font-semibold text-primary hover:text-primary-strong"
            >
              Lihat semua properti
            </Link>
          </div>
        </Panel>

        <Panel title="Aktivitas terakhir" description="Perubahan yang dicatat sistem.">
          {aktivitas === null ? (
            <EmptyRow>Catatan aktivitas belum bisa dimuat.</EmptyRow>
          ) : aktivitas.length === 0 ? (
            <EmptyRow>Belum ada aktivitas yang tercatat.</EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {aktivitas.map((item) => (
                <li key={item.id} className="py-3">
                  <p className="text-sm font-medium">{labelAksi(item.action)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.actorName} · {formatTanggal(item.createdAt)}
                  </p>
                  {item.reason && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground/90">
                      {item.reason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

/**
 * Nama aksi yang tercatat di audit_logs, dalam bahasa yang bisa dibaca.
 *
 * Nilai yang belum ada di kamus ditampilkan apa adanya: tindakan baru yang
 * dicatat backend akan muncul sebagai kode, dan itu jauh lebih baik daripada
 * hilang dari daftar hanya karena belum diterjemahkan.
 */
function labelAksi(action: string): string {
  const KAMUS: Record<string, string> = {
    UBAH_STATUS_PENGGUNA: 'Perubahan status akun',
  }
  return KAMUS[action] ?? action
}
