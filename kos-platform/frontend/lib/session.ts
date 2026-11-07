/**
 * Klien sesi pengunjung.
 *
 * Terpisah dari `lib/api.ts` yang mengurus data properti: ketiga fungsi di sini
 * hanya dipakai SessionProvider, dan menaruhnya bersama membuat berkas itu
 * bercampur antara "mengambil data publik" dan "mengurus identitas pengunjung".
 *
 * Semuanya memakai `credentials: 'include'` karena token sesi hidup di cookie
 * HttpOnly — tidak ada satu pun nilainya yang bisa dibaca kode di browser.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface SessionUser {
  id: string
  full_name: string
  email: string
  role: string
}

/**
 * Sesi yang sedang berlaku, atau `null` bila belum masuk.
 *
 * Endpoint ini menuntut access token yang masih hidup (15 menit), jadi
 * jawabannya `null` juga ketika tokennya sekadar kedaluwarsa — bukan hanya
 * ketika pengunjung memang belum pernah masuk. Pemanggil yang butuh tahu
 * bedanya memakai `refreshSession()` sebagai langkah kedua.
 */
export async function fetchSession(): Promise<SessionUser | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: { user: SessionUser } }
    return payload.data.user
  } catch {
    return null
  }
}

/**
 * Perpanjang sesi memakai cookie refresh, tanpa meminta kata sandi lagi.
 *
 * Inilah yang membuat pengunjung tidak perlu berulang kali masuk: cookie
 * access-nya berumur 15 menit dan hampir selalu sudah habis saat mereka
 * membuka situs lagi besok, sedangkan cookie refresh masih berlaku 30 hari.
 */
export async function refreshSession(): Promise<SessionUser | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: { user: SessionUser } }
    return payload.data.user
  } catch {
    return null
  }
}

/**
 * Akhiri sesi di server; kedua cookienya dihapus dari sana.
 *
 * Kegagalan jaringan sengaja tidak dilempar: pemanggil tetap membersihkan
 * keadaan di layar, dan cookie yang tertinggal akan kedaluwarsa sendiri.
 * Menahan pengunjung di halaman "masih masuk" hanya karena server tidak
 * terjangkau tidak ada gunanya.
 */
export async function logoutAccount(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Diabaikan dengan sengaja — lihat penjelasan di atas.
  }
}
