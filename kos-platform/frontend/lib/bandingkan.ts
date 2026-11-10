/**
 * Daftar kos yang sedang dibandingkan.
 *
 * Disimpan di peramban, bukan di server: yang dibandingkan adalah pilihan
 * sesaat waktu memutuskan, bukan koleksi yang perlu dibuka lagi dari perangkat
 * lain seperti favorit. Menyimpannya di server berarti satu tabel, satu
 * endpoint, dan satu layar pengelolaan baru untuk data yang umurnya beberapa
 * menit.
 *
 * Isinya slug, bukan id: halaman detail properti dibuka lewat slug, jadi
 * pilihan yang tersimpan tetap bisa dibuka langsung tanpa mencari id-nya dulu.
 *
 * Batasnya empat kos. Tiga sudah cukup untuk dua pilihan yang benar-benar
 * dipertimbangkan, dan lebih dari empat membuat tabelnya berdesakan sampai
 * tidak terbaca di layar mana pun.
 */

import { useCallback, useEffect, useState } from 'react'

export const MAKS_BANDINGKAN = 4

const KUNCI = 'kos-platform:bandingkan'

/**
 * Peristiwa sendiri, bukan hanya `storage`.
 *
 * `storage` hanya dikirim ke tab LAIN, sehingga dua tombol bandingkan di
 * halaman yang sama tidak saling tahu. Peristiwa ini yang menyinkronkan
 * keduanya, dan `storage` tetap dipasang supaya tab yang berbeda ikut seragam.
 */
const PERISTIWA = 'bandingkan-berubah'

const adaPeramban = (): boolean => typeof window !== 'undefined'

export const bacaBandingkan = (): string[] => {
  if (!adaPeramban()) return []

  try {
    const mentah = window.localStorage.getItem(KUNCI)
    if (!mentah) return []

    const isi = JSON.parse(mentah) as unknown
    if (!Array.isArray(isi)) return []

    return isi
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .slice(0, MAKS_BANDINGKAN)
  } catch {
    // Isi yang rusak diperlakukan sebagai daftar kosong, bukan dibiarkan
    // melempar: halaman yang gagal dibuka karena satu baris localStorage yang
    // tidak terbaca jauh lebih merugikan daripada kehilangan pilihan sementara.
    return []
  }
}

const simpan = (daftar: string[]): void => {
  if (!adaPeramban()) return

  window.localStorage.setItem(KUNCI, JSON.stringify(daftar.slice(0, MAKS_BANDINGKAN)))
  window.dispatchEvent(new Event(PERISTIWA))
}

export const tambahBandingkan = (slug: string): void => {
  const daftar = bacaBandingkan()
  if (daftar.includes(slug) || daftar.length >= MAKS_BANDINGKAN) return
  simpan([...daftar, slug])
}

export const hapusBandingkan = (slug: string): void => {
  simpan(bacaBandingkan().filter((item) => item !== slug))
}

export const bersihkanBandingkan = (): void => {
  simpan([])
}

/**
 * Pilihan bandingkan sebagai keadaan React.
 *
 * Daftarnya dibaca setelah komponen terpasang, bukan saat render pertama:
 * membacanya saat render membuat HTML dari server dan HTML dari peramban
 * berbeda, dan React menolak hasil yang tidak cocok.
 */
export function useBandingkan() {
  const [daftar, setDaftar] = useState<string[]>([])
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    const muat = (): void => {
      setDaftar(bacaBandingkan())
      setSiap(true)
    }

    muat()
    window.addEventListener(PERISTIWA, muat)
    window.addEventListener('storage', muat)

    return () => {
      window.removeEventListener(PERISTIWA, muat)
      window.removeEventListener('storage', muat)
    }
  }, [])

  const tambah = useCallback((slug: string) => tambahBandingkan(slug), [])
  const hapus = useCallback((slug: string) => hapusBandingkan(slug), [])
  const bersihkan = useCallback(() => bersihkanBandingkan(), [])

  return {
    daftar,
    siap,
    penuh: daftar.length >= MAKS_BANDINGKAN,
    tambah,
    hapus,
    bersihkan,
  }
}
