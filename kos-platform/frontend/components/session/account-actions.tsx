'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Loader2, LogIn, LogOut } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'

/** Inisial nama untuk avatar: maksimal dua huruf pertama. */
const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

/**
 * Kontrol akun di navbar: masuk, atau identitas pengunjung yang sudah masuk.
 *
 * Satu komponen untuk navbar layar lebar dan panel ponsel supaya keduanya
 * tidak pernah menampilkan keadaan yang berbeda.
 *
 * Selama status masih `memuat`, yang tampil kerangka abu-abu, bukan tombol
 * masuk. Menampilkan "Masuk" lalu menukarnya dengan nama pengguna sepersekian
 * detik kemudian membuat pengunjung yang sudah masuk mengira sesinya hilang.
 */
export function AccountActions({ onNavigate }: { onNavigate?: () => void }) {
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
    return <div aria-hidden className="h-9 w-24 animate-pulse rounded-full bg-muted" />
  }

  if (status === 'tamu' || !user) {
    return (
      <Link
        href="/masuk"
        onClick={onNavigate}
        className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <LogIn className="size-4 shrink-0" aria-hidden="true" />
        Masuk
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Nama dan avatar menuju halaman profil, satu-satunya jalan ke sana
          dari navbar, jadi keduanya harus bisa diklik. */}
      <Link
        href="/profil"
        onClick={onNavigate}
        className="inline-flex h-9 max-w-[11rem] items-center gap-2 rounded-full bg-accent px-1.5 pr-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/80"
      >
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
        >
          {initials(user.full_name)}
        </span>
        <span className="truncate">{user.full_name}</span>
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        disabled={keluar}
        aria-label="Keluar dari akun"
        title="Keluar"
        className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
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
