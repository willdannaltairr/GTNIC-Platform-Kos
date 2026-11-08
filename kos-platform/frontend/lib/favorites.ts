/**
 * Klien data favorit.
 *
 * Seperti lib/api.ts, fungsinya mengembalikan null ketika API tidak dapat
 * dihubungi, supaya halaman menampilkan penjelasan keadaan alih-alih layar
 * putih. Bedanya, semua endpoint di sini menuntut sesi, jadi null juga berarti
 * pengunjung belum masuk atau sesinya sudah berakhir.
 *
 * Daftarnya dikembalikan dalam bentuk kartu properti yang sama dengan halaman
 * pencarian, bukan sekadar id. Halaman favorit dibuka untuk melihat kosnya,
 * jadi mengirim id saja memaksa pemanggil mengambil tiap baris satu per satu.
 */

import type { PropertyListItem } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/** Properti yang difavoritkan pengguna yang sedang masuk. */
export async function fetchFavorites(): Promise<PropertyListItem[] | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/favorites`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: PropertyListItem[] }
    return payload.data
  } catch {
    return null
  }
}

/**
 * Ubah keadaan favorit.
 *
 * Menambah dan menghapus dibedakan oleh metode HTTP-nya saja, jadi keduanya
 * lewat satu jalur. Menambah dua kali aman: backend memakai ON CONFLICT DO
 * NOTHING, sehingga menekan tombol dari dua tab berakhir pada keadaan yang
 * sama.
 *
 * Mengembalikan keadaan akhirnya, atau null bila gagal. Pemanggil memakai null
 * untuk mengembalikan tombolnya ke keadaan semula, bukan menampilkan pilihan
 * yang tidak pernah tersimpan.
 */
async function ubahFavorit(propertyId: string, hapus: boolean): Promise<boolean | null> {
  try {
    const response = await fetch(
      hapus
        ? `${API_BASE}/api/v1/favorites/${encodeURIComponent(propertyId)}`
        : `${API_BASE}/api/v1/favorites`,
      hapus
        ? { method: 'DELETE', credentials: 'include' }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ propertyId }),
          },
    )

    if (!response.ok) return null

    const payload = (await response.json()) as { data: { favorited: boolean } }
    return payload.data.favorited
  } catch {
    return null
  }
}

export const addFavorite = (propertyId: string): Promise<boolean | null> =>
  ubahFavorit(propertyId, false)

export const removeFavorite = (propertyId: string): Promise<boolean | null> =>
  ubahFavorit(propertyId, true)

/**
 * Kumpulan id properti yang difavoritkan, diambil sekali per muat halaman.
 *
 * Dipakai tombol hati pada kartu properti. Satu halaman daftar bisa memuat
 * sembilan kartu atau lebih, dan tanpa penanda ini setiap kartu akan menembak
 * API sendiri untuk menanyakan hal yang sama, dengan jawaban yang sama.
 *
 * Janji (promise) yang sedang berjalan disimpan, bukan hasilnya saja: kartu
 * kedua yang menempel sebelum jawaban pertama datang akan ikut menunggu janji
 * yang sama, bukan memulai permintaan baru.
 *
 * `segarkan` dipakai setelah tombol mengubah keadaan, supaya penanda ini tidak
 * tertinggal dari kenyataan di server.
 */
let janjiFavorit: Promise<Set<string>> | null = null

export function fetchFavoriteIds(segarkan = false): Promise<Set<string>> {
  if (!janjiFavorit || segarkan) {
    janjiFavorit = (async () => {
      const daftar = await fetchFavorites()
      return new Set((daftar ?? []).map((properti) => properti.id))
    })()
  }

  return janjiFavorit
}
