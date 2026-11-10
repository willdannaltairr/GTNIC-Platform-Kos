'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Loader2, MailCheck, UserPlus } from 'lucide-react'
import { AuthField } from '@/components/auth/auth-field'
import { AuthMark } from '@/components/auth/auth-mark'
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
 * Hanya syarat yang benar-benar diperiksa server yang ditulis di sini -
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
 * LoginForm, termasuk isiannya yang memakai AuthField yang sama, supaya
 * berpindah antara masuk dan daftar tidak terasa seperti berpindah aplikasi.
 * Tautan pindah ke halaman masuk ada di kaki kolom (AuthShell), bukan di sini.
 */
export function RegisterForm() {
  const [role, setRole] = useState<'TENANT' | 'OWNER'>('TENANT')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [terdaftar, setTerdaftar] = useState<{ email: string; devToken: string | null } | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmitting(true)
    setError(null)

    try {
      const hasil = await registerAccount({ fullName, email, password, role })

      // Tidak langsung dilempar ke halaman masuk: pendaftar perlu tahu bahwa
      // ada tautan verifikasi menunggu di emailnya, dan itu satu-satunya saat
      // ia masih ingat alamat mana yang baru dipakai.
      setTerdaftar({ email, devToken: hasil?.verifyToken ?? null })
    } catch (caught) {
      setError(caught as ApiError)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldError = (name: string) =>
    error?.fields.find((entry) => entry.field === name)?.message

  if (terdaftar) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent text-primary">
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Akun dibuat</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Kami sudah mengirim tautan verifikasi ke{' '}
            <span className="font-medium text-foreground">{terdaftar.email}</span>. Buka
            tautannya supaya pemberitahuan booking, tagihan, dan atur ulang sandi sampai ke
            kotak masuk Anda. Tautannya berlaku 24 jam.
          </p>
        </div>

        {terdaftar.devToken && (
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <p className="font-semibold">Mode pengembangan</p>
            <p className="mt-1">
              Email tidak dikirim karena kunci penyedia email belum diisi. Tautannya:
            </p>
            <Link
              href={`/verifikasi-email?token=${encodeURIComponent(terdaftar.devToken)}`}
              className="mt-1 block break-all font-medium underline"
            >
              /verifikasi-email?token={terdaftar.devToken}
            </Link>
          </div>
        )}

        <Link
          href="/masuk"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk ke akun
        </Link>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Belum menerima emailnya? Setelah masuk, halaman profil punya tombol kirim ulang.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-4 text-center">
        <AuthMark icon={UserPlus} />

        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Buat akun baru</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Satu akun untuk mencari kos atau mengelola properti. Pilih peran Anda di bawah.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-muted-foreground">Saya mendaftar sebagai</legend>
        {/* Dua pilihan peran disandingkan, bukan ditumpuk: formulir ini sudah
            memuat tiga isian, dan pada laptop pendek tinggi tambahan dari dua
            kartu bertumpuk membuat kolomnya harus digulir. */}
        <div className="mt-1.5 grid gap-2.5 sm:grid-cols-2">
          {ROLE_OPTIONS.map((option) => {
            const active = role === option.value

            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 transition-colors ${
                  active
                    ? 'border-primary bg-accent/60'
                    : 'border-border bg-card/70 hover:border-primary/40'
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

      <div className="grid gap-4">
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
          {/* Titik penandanya menyala hijau begitu syaratnya terpenuhi, jadi
              pengunjung tahu sebelum menekan tombol, bukan setelah ditolak. */}
          <ul className="mt-2.5 grid gap-1.5">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.met(password)

              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    met ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`size-1.5 shrink-0 rounded-full transition-colors ${
                      met ? 'bg-primary' : 'bg-muted-foreground/40'
                    }`}
                  />
                  {rule.label}
                  <span className="sr-only">{met ? ', terpenuhi' : ', belum terpenuhi'}</span>
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitting ? 'Mendaftarkan…' : 'Daftar'}
      </button>
    </form>
  )
}
