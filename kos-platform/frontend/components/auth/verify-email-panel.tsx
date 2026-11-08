'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Loader2, MailWarning } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { resendEmailVerification, verifyEmail, type ApiError } from '@/lib/api'

type Keadaan = 'memeriksa' | 'berhasil' | 'gagal'

/**
 * Panel verifikasi email.
 *
 * Halaman ini punya dua wajah yang ditentukan ada tidaknya token di alamatnya:
 * membuka tautan dari email berarti memverifikasi, sedangkan membukanya tanpa
 * token berarti pengunjung mencari jalan untuk meminta tautan baru. Keduanya
 * ditangani di satu tempat supaya halaman ini tetap satu tujuan, bukan dua yang
 * mirip.
 *
 * Verifikasinya otomatis saat halaman dibuka, bukan lewat tombol. Tautan di
 * email adalah bukti kepemilikan alamatnya; meminta penerimanya menekan tombol
 * lagi setelah menekan tautan hanya menambah satu langkah tanpa menambah
 * kepastian apa pun.
 *
 * Yang gagal tidak bisa mencoba lagi dengan tautan yang sama. Karena itu
 * kegagalannya selalu disertai jalan keluar: masuk lebih dulu, lalu minta
 * tautan baru dari halaman profil.
 */
export function VerifyEmailPanel({ token }: { token: string }) {
  const { user, status } = useSession()
  const [keadaan, setKeadaan] = useState<Keadaan>(token ? 'memeriksa' : 'gagal')
  const [pesan, setPesan] = useState<string>('')
  const [mengirim, setMengirim] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)
  const [terkirim, setTerkirim] = useState(false)

  useEffect(() => {
    if (!token) return

    let aktif = true

    void verifyEmail({ token })
      .then(() => {
        if (aktif) setKeadaan('berhasil')
      })
      .catch((error: ApiError) => {
        if (!aktif) return
        setPesan(error.message)
        setKeadaan('gagal')
      })

    return () => {
      aktif = false
    }
  }, [token])

  const kirimUlang = useCallback(async (): Promise<void> => {
    setMengirim(true)
    setPesan('')

    try {
      const hasil = await resendEmailVerification()
      setDevToken(hasil?.devToken ?? null)
      setTerkirim(true)
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Tautan tidak terkirim, coba lagi.')
    } finally {
      setMengirim(false)
    }
  }, [])

  if (keadaan === 'memeriksa') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <h1 className="font-heading text-3xl font-bold tracking-tight">Sedang memverifikasi</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Mohon tunggu sebentar, tautan Anda sedang diperiksa.
        </p>
      </div>
    )
  }

  if (keadaan === 'berhasil') {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent text-primary">
            <BadgeCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Email terverifikasi</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Terima kasih. Alamat email Anda sudah dipastikan, jadi pemberitahuan booking, tagihan,
            dan atur ulang sandi akan sampai ke kotak masuk Anda.
          </p>
        </div>

        <Link
          href="/masuk"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk ke akun
        </Link>
      </div>
    )
  }

  // Sampai di sini berarti tidak ada token di alamatnya, atau tokennya ditolak
  // server. Keduanya berujung pada hal yang sama: tautannya perlu diterbitkan
  // ulang oleh pemilik akunnya.
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-amber-100 text-amber-700">
          <MailWarning className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Verifikasi email</h1>
        <p className="text-sm text-balance text-muted-foreground">
          {pesan
            ? pesan
            : 'Halaman ini memverifikasi alamat email akun KosPlatform. Buka tautan yang kami kirim ke email Anda, atau minta tautan baru di bawah.'}
        </p>
      </div>

      {status === 'memuat' ? (
        <p className="text-center text-sm text-muted-foreground">Memeriksa sesi…</p>
      ) : user ? (
        terkirim ? (
          <div className="flex flex-col gap-3">
            <p
              role="status"
              className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200"
            >
              Tautan baru sudah dikirim ke {user.email}. Tautannya berlaku 24 jam.
            </p>

            {devToken && (
              <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
                <p className="font-semibold">Mode pengembangan</p>
                <p className="mt-1">
                  Email tidak dikirim karena kunci penyedia email belum diisi. Tautannya:
                </p>
                <Link
                  href={`/verifikasi-email?token=${encodeURIComponent(devToken)}`}
                  className="mt-1 block break-all font-medium underline"
                >
                  /verifikasi-email?token={devToken}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={kirimUlang}
            disabled={mengirim}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
          >
            {mengirim && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {mengirim ? 'Mengirim…' : 'Kirim tautan verifikasi'}
          </button>
        )
      ) : (
        <>
          <Link
            href="/masuk"
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong"
          >
            Masuk untuk minta tautan baru
          </Link>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Tautan verifikasi dikirim ke email akun Anda, jadi kami perlu tahu akun mana yang
            dimaksud. Setelah masuk, halaman profil menyediakan tombol kirim ulang.
          </p>
        </>
      )}

      {pesan && user && !terkirim && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}
    </div>
  )
}
