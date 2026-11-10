'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Heart,
  Home,
  LayoutDashboard,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/landing/logo'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { AccountActions } from '@/components/session/account-actions'
import { useSession } from '@/components/session/session-provider'
import { cn } from '@/lib/utils'

interface NavLink {
  label: string
  href: string
  icon: LucideIcon
}

/**
 * Navigasi utama aplikasi.
 *
 * Enam tautan sebaris, tanpa dropdown: halaman-halaman yang dulu tersembunyi di
 * dalam menu turun sekarang punya halaman sendiri (`/kawasan`, `/alat`, dan
 * `/saya`), sehingga navbar tidak perlu lagi menyimpan tiga puluh tautan di
 * dalam panel yang harus dibuka dulu. Yang tersisa di sini hanyalah pintu masuk
 * tingkat pertama, dan sisanya dijelajahi lewat halaman hub itu.
 */
const LINKS: NavLink[] = [
  { label: 'Beranda', href: '/beranda', icon: Home },
  { label: 'Cari Kos', href: '/kos', icon: Search },
  { label: 'Kawasan', href: '/kawasan', icon: MapPin },
  { label: 'Alat', href: '/alat', icon: Sparkles },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Saya', href: '/saya', icon: Heart },
]

/**
 * Tautan panel admin, hanya untuk akun berperan ADMIN.
 *
 * Peran dibaca dari sesi yang sudah divalidasi ke API, bukan dari keadaan di
 * peramban. Yang tampil di sini hanya kemudahan; server tetap menolak siapa
 * pun yang bukan admin, dan menyembunyikan tautannya tidak pernah menjadi
 * batas keamanan.
 */
const LINK_ADMIN: NavLink = { label: 'Panel admin', href: '/admin', icon: ShieldCheck }

/**
 * Menu dianggap aktif bila alamatnya sama persis, atau merupakan halaman anak
 * dari menu tersebut, sehingga /kos/[slug] tetap menandai "Cari Kos".
 *
 * Perbandingan hanya memakai path, bukan query string: /kos?city=Bandung dan
 * /kos?city=Depok berada di halaman yang sama, jadi keduanya bukan menu
 * berbeda yang perlu ditandai sendiri-sendiri.
 */
const isActive = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`)

/**
 * Bentuk tautan navbar: teks biasa, bukan pil.
 *
 * Tautan berikon di dalam pil membuat enam menu memakan hampir seluruh lebar
 * navbar dan menyisakan sedikit ruang untuk lonceng dan nama akun. Sebagai teks
 * biasa, keenamnya muat dalam satu baris dan yang membedakan menu aktif dari
 * yang lain cukup warnanya.
 */
const LINK_CLASS =
  'inline-flex h-9 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors'

/** Navbar aplikasi: navbar di atas, isi halaman memakai lebar penuh. */
export function AppNavbar() {
  const pathname = usePathname()
  const { user } = useSession()
  const [menuPonsel, setMenuPonsel] = useState(false)

  // Pindah halaman menutup menu ponsel: panel yang masih terbuka di halaman
  // baru menutupi isinya.
  useEffect(() => {
    setMenuPonsel(false)
  }, [pathname])

  const tautan = user?.role === 'ADMIN' ? [...LINKS, LINK_ADMIN] : LINKS

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:h-[72px] sm:px-6 lg:px-8">
        <Link
          href="/beranda"
          aria-label="KosPlatform, beranda"
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        {/* Navigasi mendatar baru muncul di layar lebar (xl). Di bawahnya,
            enam menu ditambah lonceng dan nama akun tidak lagi muat sebaris. */}
        <nav aria-label="Navigasi utama" className="ml-6 hidden items-center gap-0.5 xl:flex">
          {tautan.map((link) => {
            const active = isActive(pathname, link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  LINK_CLASS,
                  active ? 'text-primary' : 'text-muted-foreground hover:text-primary',
                )}
              >
                {link.label}
              </Link>
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
            className="grid size-10 place-items-center rounded-full border border-border xl:hidden"
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
        <div className="border-t border-border bg-card xl:hidden">
          <nav aria-label="Navigasi utama" className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <ul className="space-y-0.5">
              {tautan.map((link) => {
                const Icon = link.icon
                const active = isActive(pathname, link.href)

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      )}
    </header>
  )
}
