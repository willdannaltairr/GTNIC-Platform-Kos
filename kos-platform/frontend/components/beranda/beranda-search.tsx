'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'

/**
 * Kolom pencarian di tengah atas beranda.
 *
 * Beranda sengaja tidak menyaring hasil di tempat: satu kotak pencarian di
 * sini hanya meneruskan kata kuncinya ke /kos, tempat penyaring lengkap berada.
 * Dua tempat yang menyaring dengan aturan berbeda akan menghasilkan jawaban
 * berbeda untuk pertanyaan yang sama.
 */
export function BerandaSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const trimmed = q.trim()

    router.push(trimmed ? `/kos?q=${encodeURIComponent(trimmed)}` : '/kos')
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl" role="search">
      <label htmlFor="beranda-q" className="sr-only">
        Cari kos
      </label>

      <div className="flex items-center gap-2 rounded-full border border-border bg-card py-2 pl-5 pr-2 shadow-sm transition-shadow focus-within:shadow-md">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

        <input
          id="beranda-q"
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Cari kos, kampus, atau daerah, mis. dekat UI"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />

        <button
          type="submit"
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Cari
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Hasil lengkap beserta penyaring harga, fasilitas, dan tipe kos ada di halaman Cari Kos.
      </p>
    </form>
  )
}
