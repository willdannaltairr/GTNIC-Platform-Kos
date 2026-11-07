'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Loader2, LogIn, LogOut, UserPlus } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { cn } from '@/lib/utils'

/** Sebutan peran dalam bahasa Indonesia untuk kartu akun di sidebar. */
const ROLE_LABEL: Record<string, string> = {
  TENANT: 'Pencari kos',
  OWNER: 'Pemilik kos',
  ADMIN: 'Administrator',
}

/** Inisial nama untuk avatar: maksimal dua huruf pertama. */
const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

/**
 * Kontrol akun: masuk, daftar, atau identitas pengunjung yang sudah masuk.
 *
 * Satu komponen untuk sidebar dan kedua header supaya ketiganya tidak pernah
 * menampilkan keadaan yang berbeda — dulu tombol "Masuk" muncul di tiga tempat
 * dan tidak satu pun tahu ada sesi berjalan.
 *
 * Selama status masih `memuat`, yang tampil kerangka abu-abu, bukan tombol
 * masuk. Menampilkan "Masuk" lalu menukarnya dengan nama pengguna sepersekian
 * detik kemudian membuat pengunjung yang sudah masuk mengira sesinya hilang —
 * persis keluhan yang membuat penyimpanan sesi ini dibuat.
 */
export function AccountActions({
  variant,
  onNavigate,
}: {
  variant: 'sidebar' | 'header' | 'landing'
  onNavigate?: () => void
}) {
  const { user, status, logout } = useSession()
  const [keluar, setKeluar] = useState(false)

  const handleLogout = async (): Promise<void> => {
    setKeluar(true)
    try {
      await logout()
      onNavigate?.()
    } finally {
      setKeluar(false)
    }
  }

  if (status === 'memuat') {
    return (
      <div
        aria-hidden
        className={cn(
          'animate-pulse rounded-xl bg-muted',
          variant === 'sidebar' ? 'h-[104px] w-full' : 'h-10 w-32',
        )}
      />
    )
  }

  if (status === 'tamu' || !user) {
    if (variant === 'header') {
      return (
        <Link
          href="/masuk"
          onClick={onNavigate}
          className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Masuk
        </Link>
      )
    }

    if (variant === 'landing') {
      return (
        <Link
          href="/masuk"
          onClick={onNavigate}
          className="hidden h-10 items-center rounded-full px-4 text-sm font-medium text-forest transition-colors hover:bg-forest/[0.06] sm:inline-flex"
        >
          Masuk
        </Link>
      )
    }

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

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2">
        {/* Nama hanya tampil di layar lebar; di layar sempit tombolnya saja
            supaya navbar tidak berdesakan. */}
        <span className="hidden max-w-[9rem] truncate text-sm font-medium lg:block">
          {user.full_name}
        </span>

        <button
          type="button"
          onClick={handleLogout}
          disabled={keluar}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {keluar ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">{keluar ? 'Mengakhiri…' : 'Keluar'}</span>
        </button>
      </div>
    )
  }

  if (variant === 'landing') {
    return (
      <div className="hidden items-center gap-2 sm:flex">
        <Link
          href="/beranda"
          onClick={onNavigate}
          className="inline-flex h-10 max-w-[11rem] items-center gap-2 rounded-full bg-white/70 px-4 text-sm font-medium text-forest ring-1 ring-forest/10 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{user.full_name}</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={keluar}
          aria-label="Keluar dari akun"
          className="grid size-10 place-items-center rounded-full text-forest transition-colors hover:bg-forest/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {keluar ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-xl bg-accent px-3 py-2.5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
        >
          {initials(user.full_name)}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">
            {user.full_name}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {ROLE_LABEL[user.role] ?? user.role}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={keluar}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
      >
        {keluar ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
        )}
        {keluar ? 'Mengakhiri…' : 'Keluar'}
      </button>
    </div>
  )
}
