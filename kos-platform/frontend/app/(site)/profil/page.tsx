'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { resendEmailVerification } from '@/lib/api'
import { fetchProfile, updateProfile, type SessionProfile } from '@/lib/session'
import { formatTanggal } from '@/lib/format'

const ROLE_LABEL: Record<string, string> = {
  TENANT: 'Pencari kos',
  OWNER: 'Pemilik kos',
  ADMIN: 'Administrator',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Aktif',
  SUSPENDED: 'Ditangguhkan',
  BANNED: 'Diblokir',
  PENDING_VERIFICATION: 'Menunggu verifikasi',
}

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

/**
 * Halaman profil pengguna.
 *
 * Satu halaman untuk kedua peran: yang berbeda antara pencari kos dan pemilik
 * hanya sebutan perannya. Data yang ditampilkan semuanya datang dari
 * `/auth/me`, jadi tidak ada yang bisa dipalsukan dari sisi klien.
 *
 * Nomor telepon hanya dikirim saat benar-benar diisi. Skema di backend menolak
 * nomor yang lebih pendek dari 8 karakter, sehingga mengirim string kosong
 * akan gagal padahal pengunjung hanya ingin mengubah namanya.
 */
export default function ProfilPage() {
  const { user, status } = useSession()
  const [profil, setProfil] = useState<SessionProfile | null>(null)
  const [siap, setSiap] = useState(false)
  const [nama, setNama] = useState('')
  const [telepon, setTelepon] = useState('')
  const [simpan, setSimpan] = useState(false)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)
  const [mengirimVerifikasi, setMengirimVerifikasi] = useState(false)
  const [pesanVerifikasi, setPesanVerifikasi] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchProfile().then((hasil) => {
      if (!aktif) return
      setProfil(hasil)
      if (hasil) {
        setNama(hasil.full_name)
        setTelepon(hasil.phone_number ?? '')
      }
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user])

  const kirim = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSimpan(true)
    setPesan(null)

    try {
      const isian: { fullName: string; phoneNumber?: string } = { fullName: nama.trim() }
      const nomor = telepon.trim()
      if (nomor) isian.phoneNumber = nomor

      const hasil = await updateProfile(isian)
      setProfil(hasil)
      setNama(hasil.full_name)
      setTelepon(hasil.phone_number ?? '')
      setPesan({
        nada: 'sukses',
        teks: 'Perubahan tersimpan. Nama di navigasi ikut berubah saat halaman dimuat ulang.',
      })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Perubahan tidak tersimpan.',
      })
    } finally {
      setSimpan(false)
    }
  }

  /**
   * Kirim ulang tautan verifikasi email ke alamat akun yang sedang masuk.
   *
   * Alamatnya tidak ikut dikirim dari sini: server mengambilnya dari sesi, jadi
   * tidak ada cara memakai tombol ini untuk mengirim email ke orang lain.
   */
  const kirimVerifikasi = async (): Promise<void> => {
    setMengirimVerifikasi(true)
    setPesanVerifikasi(null)

    try {
      await resendEmailVerification()
      setPesanVerifikasi('Tautan verifikasi sudah dikirim ke email di atas. Tautannya berlaku 24 jam.')
    } catch (error) {
      setPesanVerifikasi(error instanceof Error ? error.message : 'Tautan tidak terkirim, coba lagi.')
    } finally {
      setMengirimVerifikasi(false)
    }
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user || !profil) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk melihat profil</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Profil berisi data akun Anda, jadi hanya bisa dibuka setelah masuk.
        </p>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <header>
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Profil saya</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Data akun dan kontak yang dipakai di seluruh platform.
        </p>
      </header>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
          >
            {initials(profil.full_name)}
          </span>

          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{profil.full_name}</p>
            <p className="truncate text-sm text-muted-foreground">{profil.email}</p>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Peran
            </dt>
            <dd className="mt-1 text-sm">{ROLE_LABEL[profil.role] ?? profil.role}</dd>
          </div>

          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Status akun
            </dt>
            <dd className="mt-1 text-sm">
              {STATUS_LABEL[profil.account_status] ?? profil.account_status}
            </dd>
          </div>

          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Terdaftar
            </dt>
            <dd className="mt-1 text-sm">{formatTanggal(profil.created_at)}</dd>
          </div>

          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Masuk terakhir
            </dt>
            <dd className="mt-1 text-sm">{formatTanggal(profil.last_login_at)}</dd>
          </div>

          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Email terverifikasi
            </dt>
            <dd className="mt-1 text-sm">
              {profil.email_verified_at
                ? formatTanggal(profil.email_verified_at)
                : 'Belum diverifikasi'}
            </dd>
          </div>
        </dl>

        {/* Tautan verifikasi hanya masuk akal selama emailnya belum dipastikan,
            jadi tombolnya tidak ditampilkan sama sekali setelah terverifikasi.
            Alamatnya ditentukan server dari sesi, bukan dari isian di sini. */}
        {!profil.email_verified_at && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={kirimVerifikasi}
              disabled={mengirimVerifikasi}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold transition-colors hover:border-primary/40 disabled:opacity-70"
            >
              {mengirimVerifikasi && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {mengirimVerifikasi ? 'Mengirim...' : 'Kirim tautan verifikasi'}
            </button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {pesanVerifikasi ??
                'Kami kirim tautan ke alamat email di atas untuk memastikan alamatnya benar.'}
            </p>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold tracking-tight">Ubah data</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Email tidak bisa diubah dari sini karena dipakai untuk masuk dan verifikasi akun.
        </p>

        <form onSubmit={kirim} className="mt-4 grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-foreground">Nama lengkap</span>
            <input
              value={nama}
              onChange={(event) => setNama(event.target.value)}
              required
              minLength={2}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-foreground">Nomor telepon</span>
            <input
              value={telepon}
              onChange={(event) => setTelepon(event.target.value)}
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-[11px] text-muted-foreground">
              Dipakai pemilik kos atau calon penghuni untuk menghubungi Anda.
            </span>
          </label>

          {pesan && (
            <p
              role="status"
              className={
                pesan.nada === 'sukses'
                  ? 'rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200'
                  : 'rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200'
              }
            >
              {pesan.teks}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={simpan}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
            >
              {simpan && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {simpan ? 'Menyimpan...' : 'Simpan perubahan'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
