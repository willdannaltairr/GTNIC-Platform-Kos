'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Camera,
  ChevronDown,
  Home,
  LogIn,
  MapPin,
  Menu,
  Search,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react'
import { Logo } from '@/components/landing/logo'
import { LOCATIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface SubItem {
  label: string
  href: string
  /** Keterangan pendamping: daerah untuk kawasan, status untuk alat. */
  hint?: string
}

interface NavLink {
  label: string
  href: string
  icon: LucideIcon
  items?: SubItem[]
}

type NavEntry = NavLink | { divider: true }

const isDivider = (entry: NavEntry): entry is { divider: true } => 'divider' in entry

/**
 * Isi navigasi sidebar.
 *
 * Daftarnya mencerminkan apa yang benar-benar ada di platform, bukan menu
 * contoh. Alat yang belum bisa dipakai diberi keterangan "Segera" apa adanya —
 * menu yang menjanjikan halaman kosong lebih buruk daripada menu yang jujur.
 */
const NAV: NavEntry[] = [
  { label: 'Beranda', href: '/', icon: Home },
  { label: 'Cari Kos', href: '/kos', icon: Search },
  { divider: true },
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
  { divider: true },
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
  { label: 'Kredit Foto', href: '/kredit', icon: Camera },
]

/**
 * Menu dianggap aktif bila alamatnya sama persis, atau merupakan halaman anak
 * dari menu tersebut — sehingga /kos/[slug] tetap menandai "Cari Kos".
 *
 * Perbandingan hanya memakai path, bukan query string: /kos?city=Bandung dan
 * /kos?city=Depok berada di halaman yang sama, jadi keduanya bukan menu
 * berbeda yang perlu ditandai sendiri-sendiri.
 */
const isActive = (pathname: string, href: string): boolean => {
  if (href.startsWith('/#')) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavGroupBody({ entry, pathname, onNavigate }: {
  entry: NavLink
  pathname: string
  onNavigate: () => void
}) {
  const containsActive = (entry.items ?? []).some((item) => isActive(pathname, item.href))
  const [open, setOpen] = useState(containsActive || isActive(pathname, entry.href))

  const Icon = entry.icon

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          containsActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">{entry.label}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="mt-1 space-y-0.5 pl-4">
          {entry.items?.map((item) => (
            <li key={`${item.label}-${item.href}`}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className="block rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {/*
                  Nama dan keterangan ditumpuk, bukan disejajarkan. Sebelumnya
                  keduanya berada di satu baris dan keterangan yang panjang
                  (mis. "Lowokwaru — kawasan kampus") menekan nama kotanya
                  sampai terpotong jadi "Ban…" — kota yang tidak terbaca.
                */}
                <span className="block truncate text-sm">{item.label}</span>
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
    </li>
  )
}

function NavList({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Navigasi utama">
      <ul className="space-y-1">
        {NAV.map((entry, index) => {
          if (isDivider(entry)) {
            return (
              <li key={`divider-${index}`} role="presentation" className="py-2">
                <span className="block h-px bg-border" />
              </li>
            )
          }

          if (entry.items) {
            return (
              <NavGroupBody
                key={entry.label}
                entry={entry}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            )
          }

          const Icon = entry.icon
          const active = isActive(pathname, entry.href)

          return (
            <li key={entry.label}>
              <Link
                href={entry.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {entry.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function AuthActions({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="space-y-2">
      <Link
        href="/masuk"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogIn className="size-4 shrink-0" aria-hidden="true" />
        Masuk
      </Link>

      <Link
        href="/daftar"
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
      >
        <UserPlus className="size-4 shrink-0" aria-hidden="true" />
        Daftar
      </Link>
    </div>
  )
}

/**
 * Sidebar navigasi halaman situs.
 *
 * Dipakai halaman /kos, /kos/[slug], dan /kredit — bukan landing page (punya
 * chrome dan bahasa visual sendiri), juga bukan /masuk dan /daftar (form auth
 * butuh perhatian penuh tanpa menu yang mengalihkan).
 *
 * Di layar sempit sidebar menjadi panel yang bisa dibuka-tutup, karena kolom
 * tetap selebar 260px akan menghabiskan hampir seluruh lebar layar ponsel.
 */
export function SiteSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Bilah atas untuk layar sempit: pengganti sidebar yang tidak muat. */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-4 backdrop-blur md:hidden">
        <Link href="/" aria-label="KosPlatform — beranda">
          <Logo />
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          aria-expanded={open}
          className="grid size-10 place-items-center rounded-lg border border-border"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Panel geser untuk layar sempit. */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-forest/40 backdrop-blur-sm"
          />

          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" onClick={() => setOpen(false)} aria-label="KosPlatform — beranda">
                <Logo />
              </Link>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-border"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex-1">
              <NavList onNavigate={() => setOpen(false)} />
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <AuthActions onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Sidebar tetap untuk layar lebar. */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-4 md:flex">
        <Link
          href="/"
          aria-label="KosPlatform — beranda"
          className="rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        <div className="mt-7 flex-1">
          <NavList onNavigate={() => undefined} />
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <AuthActions onNavigate={() => undefined} />
        </div>
      </aside>
    </>
  )
}
