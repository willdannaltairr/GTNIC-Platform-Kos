'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BadgeCheck,
  Bell,
  Bookmark,
  Building2,
  Calculator,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Star,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/landing/logo'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { useSession } from '@/components/session/session-provider'
import { cn } from '@/lib/utils'

interface Tautan {
  href: string
  label: string
  icon: LucideIcon
  /** Hanya tampil untuk peran ini; kosong berarti semua peran melihatnya. */
  peran?: string[]
  /** Angka kecil di kanan tautan, mis. jumlah yang menunggu tindakan. */
  lencana?: number
}

interface KelompokSidebar {
  judul: string
  tautan: Tautan[]
}

/**
 * Isi sidebar panel.
 *
 * Urutannya mengikuti alur kerja, bukan abjad: yang dilihat setiap hari
 * (ringkasan, kamar, kalender, laporan) di atas, pengelolaan properti di
 * tengah, dan urusan akun di bawah. Yang terbuka untuk kedua peran tidak
 * ditandai, sedangkan yang khusus pemilik diberi `peran` supaya penghuni tidak
 * melihat pintu ke halaman yang akan menolaknya.
 */
const KELOMPOK: KelompokSidebar[] = [
  {
    judul: 'Hari ini',
    tautan: [
      { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
      { href: '/dashboard/kamar', label: 'Kamar dan penyewa', icon: Home, peran: ['OWNER', 'ADMIN'] },
      { href: '/dashboard/kalender', label: 'Kalender bayar', icon: CalendarClock, peran: ['OWNER', 'ADMIN'] },
      { href: '/perbaikan', label: 'Laporan kerusakan', icon: Wrench },
    ],
  },
  {
    judul: 'Pengelolaan',
    tautan: [
      { href: '/properti', label: 'Properti saya', icon: Building2, peran: ['OWNER', 'ADMIN'] },
      { href: '/keuangan', label: 'Keuangan', icon: Calculator, peran: ['OWNER', 'ADMIN'] },
      { href: '/tagihan', label: 'Tagihan', icon: FileText },
      { href: '/kontrak', label: 'Kontrak sewa', icon: ClipboardCheck },
      { href: '/booking', label: 'Booking', icon: CreditCard },
    ],
  },
  {
    judul: 'Komunikasi',
    tautan: [
      { href: '/pesan', label: 'Pesan', icon: MessageSquare },
      { href: '/ulasan', label: 'Ulasan', icon: Star },
      { href: '/notifikasi', label: 'Notifikasi', icon: Bell },
    ],
  },
  {
    judul: 'Akun',
    tautan: [
      { href: '/pencarian-tersimpan', label: 'Pencarian tersimpan', icon: Bookmark, peran: ['TENANT'] },
      { href: '/verifikasi', label: 'Verifikasi pemilik', icon: BadgeCheck, peran: ['OWNER', 'ADMIN'] },
    ],
  },
]

/**
 * Tautan dianggap aktif bila alamatnya sama persis atau merupakan halaman
 * anaknya. Perbandingan memakai path saja, tanpa query.
 */
const aktif = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`)

/**
 * Kerangka panel: sidebar di kiri, isi halaman di kanan.
 *
 * Dipakai seluruh halaman `/dashboard/**`. Halaman panel sengaja punya
 * kerangkanya sendiri, terpisah dari navbar situs: yang dibuka pemilik di sini
 * adalah pekerjaan harian, dan navbar yang mengarahkan ke landing page serta
 * bagian pemasaran tidak membantu pekerjaan itu. Jalan kembali ke situs tetap
 * ada, satu tautan di kaki sidebar.
 *
 * Sidebar hilang di layar sempit dan digantikan tombol menu: kolom tetap
 * selebar 260px di ponsel memakan hampir seluruh layar.
 */
export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useSession()
  const [terbuka, setTerbuka] = useState(false)
  const [keluar, setKeluar] = useState(false)

  // Pindah halaman menutup panel ponsel: yang masih terbuka menutupi halaman
  // barunya.
  useEffect(() => {
    setTerbuka(false)
  }, [pathname])

  const peran = user?.role ?? 'TENANT'

  const kelompok = KELOMPOK.map((item) => ({
    ...item,
    tautan: item.tautan.filter((tautan) => !tautan.peran || tautan.peran.includes(peran)),
  })).filter((item) => item.tautan.length > 0)

  const handleKeluar = async (): Promise<void> => {
    setKeluar(true)
    try {
      await logout()
    } finally {
      setKeluar(false)
    }
  }

  const isiSidebar = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5">
      <Link
        href="/beranda"
        aria-label="HuniKos, beranda"
        className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo />
      </Link>

      <nav aria-label="Navigasi panel" className="flex flex-1 flex-col gap-6">
        {kelompok.map((item) => (
          <div key={item.judul}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              {item.judul}
            </p>

            <ul className="space-y-0.5">
              {item.tautan.map((tautan) => {
                const Icon = tautan.icon
                const sekarang = aktif(pathname, tautan.href)

                return (
                  <li key={tautan.href}>
                    <Link
                      href={tautan.href}
                      aria-current={sekarang ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        sekarang
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{tautan.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border pt-4">
        <Link
          href="/beranda"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Home className="size-4 shrink-0" aria-hidden="true" />
          Kembali ke situs
        </Link>

        <button
          type="button"
          onClick={handleKeluar}
          disabled={keluar}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          {keluar ? 'Keluar…' : 'Keluar'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      {/* Sidebar tetap di layar lebar. `sticky` membuatnya ikut saat halaman
          digulir tanpa harus menyamakan tinggi badannya dengan isi halaman. */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-border bg-card lg:block">
        {isiSidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setTerbuka((nilai) => !nilai)}
            aria-expanded={terbuka}
            aria-label={terbuka ? 'Tutup navigasi' : 'Buka navigasi'}
            className="grid size-10 place-items-center rounded-full border border-border lg:hidden"
          >
            {terbuka ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>

          <p className="truncate text-sm font-medium text-muted-foreground">
            {user?.role === 'OWNER' || user?.role === 'ADMIN'
              ? 'Panel pemilik kos'
              : 'Panel pengguna'}
          </p>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />

            <Link
              href="/profil"
              className="inline-flex h-9 max-w-[10rem] items-center gap-2 rounded-full bg-accent px-1.5 pr-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/80"
            >
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              >
                {(user?.full_name ?? '?')
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((bagian) => bagian[0]?.toUpperCase() ?? '')
                  .join('')}
              </span>
              <span className="truncate">{user?.full_name ?? 'Akun'}</span>
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {terbuka && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup navigasi"
            onClick={() => setTerbuka(false)}
            className="absolute inset-0 bg-forest/40 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 left-0 w-[264px] border-r border-border bg-card">
            {isiSidebar}
          </div>
        </div>
      )}
    </div>
  )
}
