'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { addFavorite, fetchFavoriteIds, removeFavorite } from '@/lib/favorites'
import { cn } from '@/lib/utils'

/**
 * Tombol favorit untuk kartu properti.
 *
 * Keadaan awalnya dibaca dari penanda bersama di `lib/favorites.ts`, bukan
 * ditanyakan sendiri oleh tiap kartu. Satu halaman daftar memuat banyak kartu,
 * dan pertanyaan yang sama sembilan kali hanya membebani server tanpa
 * menambah apa pun.
 *
 * Perubahannya optimistis: hati berubah lebih dulu, lalu dikembalikan bila
 * server menolak. Tanpa itu tombolnya terasa tidak menanggapi klik, padahal
 * permintaannya sedang berjalan. Yang dikembalikan adalah keadaan sebenarnya,
 * bukan sekadar dibalik, supaya jawaban server tetap yang menang.
 */
export function FavoriteButton({
  propertyId,
  className,
}: {
  propertyId: string
  /** Kelas tambahan untuk menempatkan tombol di dalam kartu. */
  className?: string
}) {
  const { status } = useSession()
  const router = useRouter()
  const [favorit, setFavorit] = useState<boolean | null>(null)
  const [sedang, setSedang] = useState(false)

  useEffect(() => {
    let aktif = true

    // Tamu tidak punya daftar favorit, jadi keadaan awalnya cukup diketahui
    // tanpa memanggil API.
    if (status !== 'masuk') {
      setFavorit(false)
      return
    }

    void fetchFavoriteIds().then((kumpulan) => {
      if (aktif) setFavorit(kumpulan.has(propertyId))
    })

    return () => {
      aktif = false
    }
  }, [status, propertyId])

  const tekan = async (event: React.MouseEvent): Promise<void> => {
    event.preventDefault()
    event.stopPropagation()

    if (status !== 'masuk') {
      router.push('/masuk')
      return
    }

    if (sedang) return

    const tujuan = !favorit
    setFavorit(tujuan)
    setSedang(true)

    const hasil = tujuan ? await addFavorite(propertyId) : await removeFavorite(propertyId)

    // Server yang menentukan keadaan akhirnya. null berarti permintaannya
    // gagal, jadi tombolnya dikembalikan ke keadaan sebelum ditekan.
    setFavorit(hasil ?? !tujuan)
    setSedang(false)

    // Penanda bersama ikut disegarkan supaya kartu lain di halaman yang sama
    // tidak menampilkan keadaan lama.
    void fetchFavoriteIds(true)
  }

  const label = favorit ? 'Hapus dari favorit' : 'Simpan ke favorit'

  return (
    <button
      type="button"
      onClick={tekan}
      aria-label={label}
      aria-pressed={favorit ?? false}
      title={status === 'masuk' ? label : 'Masuk untuk menyimpan favorit'}
      className={cn(
        'grid size-8 place-items-center rounded-full bg-background/90 ring-1 ring-border backdrop-blur transition-colors hover:bg-background',
        className,
      )}
    >
      {sedang ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        <Heart
          className={cn('size-4', favorit ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground')}
          aria-hidden="true"
        />
      )}
    </button>
  )
}
