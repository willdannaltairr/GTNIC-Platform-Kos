'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthField } from '@/components/auth/auth-field'
import { resetPassword, type ApiError } from '@/lib/api'

/**
 * Formulir sandi baru, dibuka dari tautan yang dikirim lewat email.
 *
 * Isian sandinya diulang dua kali. Salah ketik pada satu-satunya isian sandi
 * baru berarti akun terkunci di luar, dan pengunjung tidak punya cara lain
 * untuk masuk selain meminta tautan baru lagi.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [done, setDone] = useState(false)

  const mismatch = confirmation.length > 0 && confirmation !== password

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmation) {
      setError({ message: 'Ulangi sandi dengan isi yang sama', fields: [] })
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await resetPassword({ token, password })
      setDone(true)
      router.push('/masuk')
    } catch (caught) {
      setError(caught as ApiError)
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Tautan tidak lengkap</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Halaman ini harus dibuka dari tautan yang kami kirim ke email Anda. Tautannya berisi kode
            yang dipakai sekali untuk membuat sandi baru.
          </p>
        </div>

        <Link
          href="/lupa-sandi"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Minta tautan baru
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Buat sandi baru</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Setelah sandi diganti, semua perangkat yang masih masuk akan diminta masuk ulang.
        </p>
      </div>

      <AuthField
        id="password"
        name="password"
        label="Sandi baru"
        type="password"
        autoComplete="new-password"
        placeholder="Minimal 8 karakter"
        required
        minLength={8}
        value={password}
        onChange={setPassword}
      />

      <AuthField
        id="konfirmasi"
        name="konfirmasi"
        label="Ulangi sandi baru"
        type="password"
        autoComplete="new-password"
        placeholder="Tulis ulang sandi yang sama"
        required
        minLength={8}
        value={confirmation}
        onChange={setConfirmation}
      />

      {mismatch && (
        <p className="text-sm text-rose-700">Kedua sandi belum sama.</p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {error.message}
        </p>
      )}

      {done && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
          Sandi diperbarui. Membuka halaman masuk…
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || mismatch}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitting ? 'Menyimpan…' : 'Simpan sandi baru'}
      </button>
    </form>
  )
}
