'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { AuthField } from '@/components/auth/auth-field'
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
 * Syarat password yang ditampilkan di bawah isiannya.
 *
 * Hanya syarat yang benar-benar diperiksa server yang ditulis di sini —
 * `registerSchema` di backend menuntut minimal 8 karakter. Menampilkan syarat
 * seperti "harus ada karakter khusus" hanya akan membuat pengunjung menyusun
 * password yang lebih rumit, lalu tetap diterima tanpa syarat itu.
 */
const PASSWORD_RULES = [{ label: 'Minimal 8 karakter', met: (value: string) => value.length >= 8 }]

/**
 * Formulir pendaftaran.
 *
 * Dipisahkan dari page.tsx supaya halamannya tetap server component dan bisa
 * memasang judul dokumennya sendiri. Susunannya sengaja dibuat sebentuk dengan
 * LoginForm — termasuk isiannya yang memakai AuthField yang sama — supaya
 * berpindah antara masuk dan daftar tidak terasa seperti berpindah aplikasi.
 */
export function RegisterForm() {
  const router = useRouter()
  const [role, setRole] = useState<'TENANT' | 'OWNER'>('TENANT')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmitting(true)
    setError(null)

    try {
      await registerAccount({ fullName, email, password, role })
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
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Buat akun baru</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Satu akun untuk mencari kos atau mengelola properti. Pilih peran Anda di bawah.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-foreground">Saya mendaftar sebagai</legend>
          {/* Dua pilihan peran disandingkan, bukan ditumpuk: formulir ini sudah
              memuat tiga isian dan satu catatan, dan pada laptop pendek tinggi
              tambahan dari dua kartu bertumpuk membuat tombol Daftar keluar
              dari kartu. */}
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
            {ROLE_OPTIONS.map((option) => {
              const active = role === option.value

              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    active
                      ? 'border-primary bg-accent/50'
                      : 'border-border bg-secondary/50 hover:border-primary/40'
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
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-3">
          <AuthField
            id="fullName"
            name="fullName"
            label="Nama lengkap"
            autoComplete="name"
            placeholder="Nama sesuai identitas"
            required
            minLength={2}
            value={fullName}
            onChange={setFullName}
          >
            {fieldError('fullName') && (
              <p className="mt-1.5 text-xs text-rose-600">{fieldError('fullName')}</p>
            )}
          </AuthField>

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
          >
            {fieldError('email') && <p className="mt-1.5 text-xs text-rose-600">{fieldError('email')}</p>}
          </AuthField>

          <AuthField
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            required
            minLength={8}
            value={password}
            onChange={setPassword}
          >
            <ul className="mt-2 grid gap-1">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.met(password)

                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      met ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <Check className="size-3.5 shrink-0" aria-hidden />
                    {rule.label}
                    <span className="sr-only">{met ? ' — terpenuhi' : ' — belum terpenuhi'}</span>
                  </li>
                )
              })}
            </ul>

            {fieldError('password') && (
              <p className="mt-1.5 text-xs text-rose-600">{fieldError('password')}</p>
            )}
          </AuthField>
        </div>

        {error && fieldError('role') === undefined && error.fields.length === 0 && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
            {error.message}
          </p>
        )}

        {error && error.fields.length > 0 && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
            {error.message}. Periksa kembali isian di atas.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitting ? 'Mendaftarkan…' : 'Daftar'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Sudah punya akun?{' '}
        <Link href="/masuk" className="font-semibold text-primary hover:text-primary-strong">
          Masuk di sini
        </Link>
      </p>

      <p className="mt-4 rounded-xl bg-secondary/60 p-3 text-xs leading-snug text-muted-foreground">
        Akun administrator dibuat terpisah oleh tim platform, begitu pula verifikasi identitas
        pemilik kos.
      </p>
    </div>
  )
}
