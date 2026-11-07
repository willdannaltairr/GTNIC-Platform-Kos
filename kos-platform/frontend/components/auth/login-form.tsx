'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AuthField } from '@/components/auth/auth-field'
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
 * lain, meski acuan desainnya memakai keduanya: platform ini belum punya alur
 * setel ulang kata sandi maupun OAuth. Tombol yang tidak menuju ke mana pun
 * hanya menjanjikan sesuatu yang tidak ada, dan pengunjung akan menekannya.
 */
export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmitting(true)
    setError(null)

    try {
      await loginAccount({ email, password })
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
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Masuk ke akun Anda</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Masuk untuk membuka daftar kos terverifikasi, menyimpan favorit, dan mengajukan sewa.
          </p>
        </div>

        <div className="grid gap-4">
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

          <AuthField
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={setPassword}
          />
        </div>

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
            Berhasil masuk. Mengalihkan…
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitting ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <Link href="/daftar" className="font-semibold text-primary hover:text-primary-strong">
          Daftar sekarang
        </Link>
      </p>

      <div className="mt-4 rounded-xl bg-secondary/60 p-3">
        <p className="text-xs font-semibold text-foreground">Akun demo (data fiktif)</p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              {account.role}:{' '}
              <code className="rounded bg-card px-1.5 py-0.5">{account.email}</code>
            </li>
          ))}
          <li>
            Password: <code className="rounded bg-card px-1.5 py-0.5">{DEMO_PASSWORD}</code>
          </li>
        </ul>
      </div>
    </div>
  )
}
