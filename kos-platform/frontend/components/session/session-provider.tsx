'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { fetchSession, logoutAccount, refreshSession, type SessionUser } from '@/lib/session'

type SessionStatus = 'memuat' | 'masuk' | 'tamu'

interface SessionValue {
  user: SessionUser | null
  status: SessionStatus
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

/**
 * Selang perpanjangan sesi otomatis.
 *
 * Access token berumur 15 menit. Sepuluh menit memberi jarak aman sebelum
 * kedaluwarsa, sehingga tab yang dibiarkan terbuka tetap punya sesi hidup —
 * pengunjung tidak sedang menatap layar saat tokennya mati, dan permintaan
 * berikutnya tidak perlu gagal dulu.
 */
const REFRESH_INTERVAL_MS = 10 * 60 * 1000

/**
 * Sesi pengunjung untuk seluruh halaman.
 *
 * Kenapa ada di sisi klien, bukan dibaca sekali di server: sesi berubah tanpa
 * halaman dimuat ulang — pengunjung masuk lewat formulir, keluar lewat tombol,
 * dan tokennya diperpanjang sendiri saat mereka kembali keesokan hari. Satu
 * sumber kebenaran di klien membuat header, sidebar, dan formulir tidak pernah
 * menampilkan keadaan yang berbeda-beda.
 *
 * Urutan pemulihannya sengaja dua langkah: coba token yang ada lebih dulu
 * (murah, tidak menulis apa pun), baru minta perpanjangan. Cookie access yang
 * sudah habis adalah keadaan normal bagi pengunjung yang kembali besok — bukan
 * tanda mereka sudah keluar — jadi perpanjangan di sini yang membedakan
 * "belum pernah masuk" dari "sesinya tinggal diperpanjang".
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<SessionStatus>('memuat')

  // Dipakai penjaga: respons dari pemuatan lama tidak boleh menimpa keadaan
  // yang lebih baru ketika pengunjung menekan "Keluar" di tengah proses.
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    const current = await fetchSession()

    if (!aliveRef.current) return

    if (current) {
      setUser(current)
      setStatus('masuk')
      return
    }

    const renewed = await refreshSession()

    if (!aliveRef.current) return

    setUser(renewed)
    setStatus(renewed ? 'masuk' : 'tamu')
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Perpanjang saat tab kembali dilihat, bukan hanya saat halaman dimuat.
   *
   * Tab yang dibuka kembali setelah berjam-jam masih memegang token lama di
   * memori. Tanpa pemeriksaan ini, permintaan pertama setelah kembali akan
   * ditolak 401 lebih dulu sebelum sesinya sempat diperpanjang.
   */
  useEffect(() => {
    if (status !== 'masuk') return

    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void refreshSession()
    }

    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => void refreshSession(), REFRESH_INTERVAL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [status])

  const router = useRouter()

  const logout = useCallback(async () => {
    await logoutAccount()

    if (!aliveRef.current) return

    setUser(null)
    setStatus('tamu')
    // Halaman server component masih memegang data milik sesi lama; refresh
    // memastikan tidak ada sisa nama atau properti yang tertinggal di layar.
    router.refresh()
  }, [router])

  const value = useMemo<SessionValue>(
    () => ({ user, status, logout }),
    [user, status, logout],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

/**
 * Keadaan sesi dari provider terdekat.
 *
 * Melempar bila dipakai di luar `SessionProvider` — pemakaian yang salah itu
 * lebih baik ketahuan saat pengembangan daripada diam-diam menampilkan
 * "belum masuk" kepada pengunjung yang sebenarnya sudah masuk.
 */
export function useSession(): SessionValue {
  const value = useContext(SessionContext)

  if (!value) {
    throw new Error('useSession harus dipakai di dalam SessionProvider')
  }

  return value
}
