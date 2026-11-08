'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthField } from '@/components/auth/auth-field'
import { forgotPassword, type ApiError } from '@/lib/api'

/**
 * Formulir permintaan tautan atur ulang sandi.
 *
 * Pesan berhasilnya sengaja tidak membedakan email yang terdaftar dari yang
 * tidak, sama seperti balasan API-nya: kalau formulir ini menjawab "email tidak
 * ditemukan", halaman ini berubah jadi alat untuk memeriksa siapa saja yang
 * punya akun di platform.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [sent, setSent] = useState(false)
  const [devToken, setDevToken] = useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmitting(true)
    setError(null)

    try {
      const result = await forgotPassword({ email })
      setDevToken(result?.devToken ?? null)
      setSent(true)
    } catch (caught) {
      setError(caught as ApiError)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Periksa email Anda</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Kalau <span className="font-medium text-foreground">{email}</span> terdaftar, kami sudah
            mengirim tautan untuk membuat sandi baru. Tautannya berlaku 60 menit dan hanya bisa
            dipakai sekali.
          </p>
        </div>

        {devToken && (
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <p className="font-semibold">Mode pengembangan</p>
            <p className="mt-1">
              Email tidak dikirim karena kunci penyedia email belum diisi. Tautannya:
            </p>
            <Link
              href={`/reset-sandi?token=${encodeURIComponent(devToken)}`}
              className="mt-1 block break-all font-medium underline"
            >
              /reset-sandi?token={devToken}
            </Link>
          </div>
        )}

        <Link
          href="/masuk"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Lupa sandi?</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Masukkan email akun Anda, kami kirimkan tautan untuk membuat sandi baru.
        </p>
      </div>

      <AuthField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="nama@email.com"
        required
        value={email}
        onChange={setEmail}
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitting ? 'Mengirim…' : 'Kirim tautan'}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Ingat sandinya?{' '}
        <Link href="/masuk" className="font-semibold text-primary hover:text-primary-strong">
          Masuk di sini
        </Link>
      </p>
    </form>
  )
}
