'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { registerAccount, type ApiError } from '@/lib/api'

const ROLE_OPTIONS = [
  {
    value: 'TENANT' as const,
    title: 'Saya mencari kos',
    description: 'Cari, bandingkan, dan ajukan sewa kos. Gratis.',
  },
  {
    value: 'OWNER' as const,
    title: 'Saya pemilik kos',
    description: 'Kelola properti, kamar, penyewa, dan tagihan.',
  },
]

/**
 * Formulir pendaftaran.
 *
 * Dipisahkan dari page.tsx supaya halamannya tetap server component dan bisa
 * memasang judul dokumennya sendiri — yang butuh state hanya formulir ini,
 * bukan tata letaknya. Susunannya sengaja dibuat sebentuk dengan LoginForm
 * supaya berpindah antara masuk dan daftar tidak terasa seperti berpindah
 * aplikasi.
 */
export function RegisterForm() {
  const router = useRouter()
  const [role, setRole] = useState<'TENANT' | 'OWNER'>('TENANT')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setSubmitting(true)
    setError(null)

    try {
      await registerAccount({
        fullName: String(form.get('fullName') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        role,
      })
      router.push('/masuk')
    } catch (caught) {
      setError(caught as ApiError)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldError = (name: string) =>
    error?.fields.find((entry) => entry.field === name)?.message

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Buat akun baru</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Satu akun untuk mencari kos atau mengelola properti. Pilih peran Anda di bawah.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-foreground">Saya mendaftar sebagai</legend>
          <div className="mt-3 grid gap-3">
            {ROLE_OPTIONS.map((option) => {
              const active = role === option.value

              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    active ? 'border-primary bg-accent/50' : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={active}
                    onChange={() => setRole(option.value)}
                    className="sr-only"
                  />
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                    }`}
                    aria-hidden
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4">
          <div>
            <label htmlFor="fullName" className="text-sm font-semibold text-foreground">
              Nama lengkap
            </label>
            <input
              id="fullName"
              name="fullName"
              required
              minLength={2}
              autoComplete="name"
              className="mt-2 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Nama sesuai identitas"
            />
            {fieldError('fullName') && (
              <p className="mt-1.5 text-xs text-rose-600">{fieldError('fullName')}</p>
            )}
          </div>

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
            {fieldError('email') && <p className="mt-1.5 text-xs text-rose-600">{fieldError('email')}</p>}
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
              minLength={8}
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Minimal 8 karakter"
            />
            {fieldError('password') && (
              <p className="mt-1.5 text-xs text-rose-600">{fieldError('password')}</p>
            )}
          </div>
        </div>

        {error && fieldError('role') === undefined && error.fields.length === 0 && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
            {error.message}
          </p>
        )}

        {error && error.fields.length > 0 && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
            {error.message}. Periksa kembali isian di atas.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitting ? 'Mendaftarkan…' : 'Daftar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Sudah punya akun?{' '}
        <Link href="/masuk" className="font-semibold text-primary hover:text-primary-strong">
          Masuk di sini
        </Link>
      </p>

      <p className="mt-6 rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        Akun administrator tidak dapat dibuat melalui formulir publik ini. Verifikasi identitas
        pemilik kos dilakukan terpisah oleh tim platform.
      </p>
    </div>
  )
}
