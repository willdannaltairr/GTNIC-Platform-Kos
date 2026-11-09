'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Compass, Heart, Home, LayoutDashboard, MapPin, Menu, Search, ShieldCheck, Sparkles, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/landing/logo'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { AccountActions } from '@/components/session/account-actions'
import { useSession } from '@/components/session/session-provider'
import { LOCATIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface SubItem {
  label: string
  href: string
  /** Keterangan pendamping: daerah untuk kawasan, status untuk alat. */
  hint?: string
}

interface NavGroup {
  label: string
  href: string
  icon: LucideIcon
  items: SubItem[]
}

/**
 * Isi navigasi aplikasi.
 *
 * Daftarnya mencerminkan apa yang benar-benar ada di platform. Alat yang belum
 * bisa dipakai diberi keterangan "Segera" apa adanya, menu yang menjanjikan
 * halaman kosong lebih buruk daripada menu yang jujur.
 */
const GROUPS: NavGroup[] = [
  {
    label: 'Rekomendasi',
    href: '/beranda',
    icon: Compass,
    items: [
      { label: 'Sekitar saya', href: '/beranda#sekitar-saya', hint: 'Pakai lokasi GPS' },
      { label: 'Rute lokasi', href: '/beranda#rute', hint: 'Dari mana ke mana' },
      { label: 'Sekitar kampus', href: '/beranda#kampus', hint: 'Kampus di Indonesia' },
    ],
  },
  {
    label: 'Kawasan',
    href: '/kos',
    icon: MapPin,
    items: LOCATIONS.map((location) => ({
      label: location.city,
      href: location.href,
      hint: location.area,
    })),
  },
  {
    label: 'Alat',
    href: '/#produk',
    icon: Sparkles,
    items: [
      { label: 'KosMatch', href: '/#kosmatch', hint: 'Segera' },
      { label: 'Simulasi Biaya', href: '/#truecost', hint: 'Aktif' },
      { label: 'Rute & Sekitar', href: '/#campusroute', hint: 'Segera' },
    ],
  },
  {
    label: 'Saya',
    href: '/favorit',
    icon: Heart,
    items: [
      { label: 'Kos favorit', href: '/favorit', hint: 'Yang Anda simpan' },
      { label: 'Booking', href: '/booking', hint: 'Pengajuan sewa' },
      { label: 'Tagihan', href: '/tagihan', hint: 'Yang perlu dibayar' },
      { label: 'Jadwal kunjungan', href: '/kunjungan', hint: 'Survei kos' },
      { label: 'Properti saya', href: '/properti', hint: 'Kelola kos Anda' },
      { label: 'Verifikasi pemilik', href: '/verifikasi', hint: 'Dokumen identitas' },
      { label: 'Notifikasi', href: '/notifikasi', hint: 'Pemberitahuan' },
    ],
  },
]

/** Tautan tunggal di navbar, di luar kelompok dropdown. */
const LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Beranda', href: '/beranda', icon: Home },
  { label: 'Cari Kos', href: '/kos', icon: Search },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]

/**
 * Tautan panel admin, hanya untuk akun berperan ADMIN.
 *
 * Peran dibaca dari sesi yang sudah divalidasi ke API, bukan dari keadaan di
 * peramban. Yang tampil di sini hanya kemudahan; server tetap menolak siapa
 * pun yang bukan admin, dan menyembunyikan tautannya tidak pernah menjadi
 * batas keamanan.
 */
const LINK_ADMIN: { label: string; href: string; icon: LucideIcon } = {
  label: 'Panel admin',
  href: '/admin',
  icon: ShieldCheck,
}

/**
 * Menu dianggap aktif bila alamatnya sama persis, atau merupakan halaman anak
 * dari menu tersebut, sehingga /kos/[slug] tetap menandai "Cari Kos".
 *
 * Perbandingan hanya memakai path, bukan query string: /kos?city=Bandung dan
 * /kos?city=Depok berada di halaman yang sama, jadi keduanya bukan menu
 * berbeda yang perlu ditandai sendiri-sendiri.
 */
const isActive = (pathname: string, href: string): boolean => {
  if (href.startsWith('/#')) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}

const LINK_CLASS =
  'inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors'

/**
 * Navbar aplikasi.
 *
 * Menggantikan sidebar: navigasi utama berada di atas, sehingga isi halaman
 * memakai lebar penuh. Menu yang punya anak (Rekomendasi, Kawasan, Alat)
 * disimpan sebagai dropdown supaya navbar tetap satu baris di layar lebar.
 */
export function AppNavbar() {
  const pathname = usePathname()
  const { user } = useSession()
  const [terbuka, setTerbuka] = useState<string | null>(null)
  const [menuPonsel, setMenuPonsel] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  // Dropdown ditutup saat klik di luar navbar atau saat Escape ditekan.
  // Keduanya tanpa ini membuat panel menggantung di atas isi halaman.
  useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setTerbuka(null)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setTerbuka(null)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Pindah halaman menutup semua panel: dropdown yang masih terbuka di
  // halaman baru menutupi isinya.
  useEffect(() => {
    setTerbuka(null)
    setMenuPonsel(false)
  }, [pathname])

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/beranda"
          aria-label="KosPlatform, beranda"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        {/* Navigasi mendatar baru muncul di layar lebar (xl). Sebelumnya di
            layar sedang, tujuh menu ditambah lonceng dan nama akun tidak lagi
            muat sebaris, dan label seperti "Cari Kos" terpotong jadi dua baris
            sehingga tinggi navbar ikut berubah. Di bawah xl semuanya masuk ke
            menu ponsel. */}
        <nav aria-label="Navigasi utama" className="ml-4 hidden items-center gap-1 xl:flex">
          {(user?.role === 'ADMIN' ? [...LINKS, LINK_ADMIN] : LINKS).map((link) => {
            const Icon = link.icon
            const active = isActive(pathname, link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  LINK_CLASS,
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {link.label}
              </Link>
            )
          })}

          {GROUPS.map((group) => {
            const Icon = group.icon
            const dibuka = terbuka === group.label
            const adaAktif =
              isActive(pathname, group.href) ||
              group.items.some((item) => isActive(pathname, item.href))

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => setTerbuka(dibuka ? null : group.label)}
                  aria-expanded={dibuka}
                  className={cn(
                    LINK_CLASS,
                    adaAktif
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {group.label}
                  <ChevronDown
                    className={cn('size-3.5 shrink-0 transition-transform', dibuka && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>

                {dibuka && (
                  <ul className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-forest/5">
                    {group.items.map((item) => (
                      <li key={`${item.label}-${item.href}`}>
                        <Link
                          href={item.href}
                          className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                        >
                          <span className="block truncate text-sm text-foreground">
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/70">
                              {item.hint}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <AccountActions />

          <button
            type="button"
            onClick={() => setMenuPonsel((nilai) => !nilai)}
            aria-expanded={menuPonsel}
            aria-label={menuPonsel ? 'Tutup menu' : 'Buka menu'}
            className="grid size-10 place-items-center rounded-lg border border-border xl:hidden"
          >
            {menuPonsel ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuPonsel && (
        <div className="border-t border-border bg-background xl:hidden">
          <nav aria-label="Navigasi utama" className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <ul className="space-y-1">
              {(user?.role === 'ADMIN' ? [...LINKS, LINK_ADMIN] : LINKS).map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {link.label}
                    </Link>
                  </li>
                )
              })}

              {GROUPS.map((group) => (
                <li key={group.label} className="pt-2">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={`${item.label}-${item.href}`}>
                        <Link
                          href={item.href}
                          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  )
}
