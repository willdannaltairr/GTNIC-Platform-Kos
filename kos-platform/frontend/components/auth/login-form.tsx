'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { loginAccount, type ApiError } from '@/lib/api'

const DEMO_ACCOUNTS = [
  { role: 'Pencari kos', email: 'tenant1@kosplatform.test' },
  { role: 'Pemilik kos', email: 'owner1@kosplatform.test' },
]

const DEMO_PASSWORD = 'KosDemo123!'

/**
 * Formulir masuk.
 *
 * Dipisahkan dari page.tsx supaya halamannya tetap server component dan bisa
 * memasang judul dokumennya sendiri — yang butuh state hanya formulir ini,
 * bukan tata letaknya.
 *
 * Tidak ada tautan "lupa kata sandi" dan tidak ada tombol masuk lewat penyedia
 * lain, meski keduanya lazim ada di halaman masuk: platform ini belum punya
 * alur setel ulang kata sandi maupun OAuth. Tautan yang tidak menuju ke mana
 * pun hanya menjanjikan sesuatu yang tidak ada.
 */
export function LoginForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setSubmitting(true)
    setError(null)

    try {
      await loginAccount({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      })
      setDone(true)
      // /kos adalah halaman yang dituju seluruh tautan dari landing page;
      // setelah masuk, pengunjung melanjutkan tepat di sana.
      router.push('/kos')
      router.refresh()
    } catch (caught) {
      setError(caught as ApiError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Masuk ke akun Anda</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Masuk untuk membuka daftar kos terverifikasi, menyimpan favorit, dan mengajukan sewa.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="nama@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-semibold text-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            {error.message}
          </p>
        )}

        {done && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
            Berhasil masuk. Mengalihkan…
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitting ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <Link href="/daftar" className="font-semibold text-primary hover:text-primary-strong">
          Daftar sekarang
        </Link>
      </p>

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-foreground">Akun demo (data fiktif)</p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              {account.role}:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5">{account.email}</code>
            </li>
          ))}
          <li>
            Password: <code className="rounded bg-muted px-1.5 py-0.5">{DEMO_PASSWORD}</code>
          </li>
        </ul>
      </div>
    </div>
  )
}
