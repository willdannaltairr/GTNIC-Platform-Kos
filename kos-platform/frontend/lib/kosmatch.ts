/**
 * Klien data KosMatch.
 *
 * Yang membedakan modul ini dari pencarian biasa: setiap hasil membawa rincian
 * faktornya sendiri, dan responsnya membawa rumus serta bobot yang benar-benar
 * dipakai. Halaman yang memakainya karena itu tidak perlu menghitung apa pun;
 * ia hanya menampilkan apa yang dikatakan server, supaya angka di layar dan
 * angka di server tidak pernah bisa berbeda.
 *
 * Fungsi bacanya mengembalikan `null` bila API tidak dapat dihubungi, sama
 * seperti klien lain. Tidak ada fungsi tulis: modul ini tidak menyimpan apa
 * pun, seluruh preferensinya hanya melewati query string.
 */

// Alamat dasar dipilih menurut sisi tempat kodenya berjalan; penjelasannya ada
// di `api-alamat.ts`.
import { API_BASE } from './api-alamat'

/** Id faktor penilaian. Urutannya sama dengan urutan tampilnya di halaman. */
export type IdFaktor = 'anggaran' | 'lokasi' | 'fasilitas' | 'preferensi'

export interface FaktorSkor {
  id: string
  label: string
  bobot: number
  /** `null` berarti faktor ini tidak dihitung, bukan dihitung sebagai nol. */
  skor: number | null
  alasan: string
}

export interface HasilKosMatch {
  id: string
  name: string
  slug: string
  city: string
  district: string
  propertyType: string
  genderPolicy: string
  imageUrl: string | null
  imageAlt: string | null
  hargaTermurah: number | null
  kamarTersedia: number
  jarakKm: number | null
  skorTotal: number
  faktor: FaktorSkor[]
}

export interface FaktorTidakDiminta {
  id: string
  label: string
  sebab: string
}

export interface PreferensiDipakai {
  maxPrice: number | null
  memakaiLokasi: boolean
  fasilitas: string[]
  bathroomType: 'private' | 'shared' | null
  minOccupants: number | null
  city: string | null
  genderPolicy: string | null
}

export interface MetaKosMatch {
  total: number
  ditampilkan: number
  bobot: Record<string, number>
  /** Kalimat rumus yang ditampilkan apa adanya, bukan disusun ulang di sini. */
  rumus: string
  faktorTidakDiminta: FaktorTidakDiminta[]
  /** Keterangan batas anggaran, atau null bila anggaran tidak diisi. */
  batasAnggaran: string | null
  preferensi: PreferensiDipakai
}

export interface HasilPencarianKosMatch {
  items: HasilKosMatch[]
  meta: MetaKosMatch
}

export interface PreferensiInput {
  maxPrice?: number
  nearLat?: number
  nearLng?: number
  facilities?: string[]
  bathroomType?: 'private' | 'shared'
  minOccupants?: number
  city?: string
  genderPolicy?: 'putra' | 'putri' | 'campur'
  limit?: number
}

export async function fetchKosMatch(
  input: PreferensiInput,
): Promise<HasilPencarianKosMatch | null> {
  const query = new URLSearchParams()

  if (input.maxPrice !== undefined) query.set('maxPrice', String(input.maxPrice))
  if (input.nearLat !== undefined) query.set('nearLat', String(input.nearLat))
  if (input.nearLng !== undefined) query.set('nearLng', String(input.nearLng))
  if (input.facilities && input.facilities.length > 0) {
    query.set('facilities', input.facilities.join(','))
  }
  if (input.bathroomType) query.set('bathroomType', input.bathroomType)
  if (input.minOccupants !== undefined) query.set('minOccupants', String(input.minOccupants))
  if (input.city) query.set('city', input.city)
  if (input.genderPolicy) query.set('genderPolicy', input.genderPolicy)
  if (input.limit !== undefined) query.set('limit', String(input.limit))

  try {
    const response = await fetch(`${API_BASE}/api/v1/match?${query.toString()}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      data: HasilKosMatch[]
      meta: MetaKosMatch
    }

    return { items: payload.data, meta: payload.meta }
  } catch {
    return null
  }
}
