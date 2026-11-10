'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, LogIn } from 'lucide-react'
import { AuthField } from '@/components/auth/auth-field'
import { AuthMark } from '@/components/auth/auth-mark'
import { useSession } from '@/components/session/session-provider'
import { loginAccount, type ApiError } from '@/lib/api'

const DEMO_ACCOUNTS = [
  { role: 'Pencari kos', email: 'tenant1@kosplatform.test' },
  { role: 'Pemilik kos', email: 'owner1@kosplatform.test' },
]

const DEMO_PASSWORD = 'KosDemo123!'

/**
 * Halaman yang ingin dibuka pengunjung sebelum gerbang memantulkannya.
 *
 * Gerbang halaman mengirim tamunya ke `/masuk?lanjut=<halaman asal>`, dan
 * jawabannya dipakai di sini supaya ia kembali ke halaman itu sesudah masuk.
 * Hanya jalur di dalam situs ini yang diterima: nilai yang datang dari alamat
 * bisa ditulis siapa saja, dan menerima alamat luar berarti halaman masuk ini
 * bisa dipakai mengarahkan orang ke situs lain sesudah mereka mengetikkan
 * sandinya. `//` di awal ditolak karena peramban membacanya sebagai alamat
 * absolut, bukan sebagai jalur.
 */
const halamanDituju = (): string | null => {
  if (typeof window === 'undefined') return null

  const nilai = new URLSearchParams(window.location.search).get('lanjut')

  if (!nilai || !nilai.startsWith('/') || nilai.startsWith('//')) return null

  return nilai
}

/**
 * Formulir masuk.
 *
 * Dipisahkan dari page.tsx supaya halamannya tetap server component dan bisa
 * memasang judul dokumennya sendiri, yang butuh state hanya formulir ini,
 * bukan tata letaknya. Tautan pindah ke halaman daftar ada di kaki kolom
 * (AuthShell), bukan di sini.
 *
 * Tautan "lupa kata sandi" ada di sini karena alurnya kini tersedia: permintaan
 * tautan lewat email dan halaman pembuatan sandi baru. Tombol masuk lewat
 * penyedia lain masih sengaja tidak ada, platform ini belum punya OAuth, dan
 * tombol yang tidak menuju ke mana pun hanya menjanjikan sesuatu yang tidak ada.
 */
export function LoginForm() {
  const router = useRouter()
  const { reload } = useSession()
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
      const hasil = await loginAccount({ email, password })

      // Sesi di klien dimuat ulang sebelum berpindah halaman. Provider hanya
      // membaca sesi sekali saat dipasang, dan halaman masuk berpindah dengan
      // navigasi klien, jadi tanpa ini navbar masih menampilkan tombol Masuk
      // dan halaman berperan menolak pengunjung yang baru saja masuk.
      await reload()

      setDone(true)

      // Pengunjung yang dipantul gerbang halaman kembali ke halaman yang tadi
      // ingin ia buka, misalnya tautan kos yang dibagikan orang lain.
      const dituju = halamanDituju()

      if (dituju) {
        router.push(dituju)
        router.refresh()
        return
      }

      // Pemilik kos diarahkan ke panelnya, bukan ke beranda pencari kos.
      // Halaman pertama yang ia butuhkan adalah kamar, tagihan, dan laporan
      // penyewanya; beranda berisi rekomendasi kos untuk dicari tidak menjawab
      // satu pun dari ketiganya.
      const pemilik = hasil?.user?.role === 'OWNER' || hasil?.user?.role === 'ADMIN'
      router.push(pemilik ? '/dashboard' : '/beranda')
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
        <div className="flex flex-col items-center gap-3 text-center">
          <AuthMark icon={LogIn} />

          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">Masuk ke akun Anda</h1>
            <p className="text-sm text-balance text-muted-foreground">
              Masuk untuk membuka daftar kos terverifikasi, menyimpan kos yang ingin
              Anda sewa, dan mengajukan sewa.
            </p>
          </div>
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
          >
            <p className="mt-1.5 text-right">
              <Link href="/lupa-sandi" className="text-xs font-medium text-primary hover:text-primary-strong">
                Lupa sandi?
              </Link>
            </p>
          </AuthField>
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitting ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <div className="mt-5 rounded-2xl bg-card/70 px-4 py-3 text-xs leading-relaxed text-muted-foreground ring-1 ring-border/60">
        <p className="font-semibold text-foreground">Akun demo (data fiktif)</p>
        {DEMO_ACCOUNTS.map((account) => (
          <p key={account.email} className="mt-1">
            {account.role}{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5">{account.email}</code>
          </p>
        ))}
        <p className="mt-1">
          Password <code className="rounded bg-secondary px-1.5 py-0.5">{DEMO_PASSWORD}</code>
        </p>
      </div>
    </div>
  )
}
