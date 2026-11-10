'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { PropertiForm } from '@/components/owner/properti-form'
import { createProperty, type PropertiInput } from '@/lib/my-properties'

/**
 * Pendaftaran properti baru.
 *
 * Hasilnya selalu draf PENDING: pemilik menambahkan kamar dan melengkapi
 * isinya lebih dulu, baru mengajukan verifikasi dari halaman detail. Kalau
 * properti langsung diajukan begitu disimpan, admin akan menerima properti
 * kosong tanpa satu pun kamar, dan yang harus memperbaikinya tetap pemiliknya.
 */
export default function PropertiBaruPage() {
  const router = useRouter()
  const { user, status } = useSession()
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    if (status === 'memuat') return
    setSiap(true)
  }, [status])

  const simpan = async (input: PropertiInput): Promise<void> => {
    const hasil = await createProperty(input)
    router.push(`/properti/${hasil.id}`)
    router.refresh()
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk menambah properti</h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Akun ini bukan akun pemilik</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Mendaftarkan kos membutuhkan akun pemilik. Daftar ulang dengan peran pemilik kos,
          atau masuk dengan akun pemilik Anda.
        </p>
        <Link
          href="/properti"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href="/properti"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Properti saya
      </Link>

      <header className="mt-4">
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">Tambah properti</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Isi alamat dan jenis kosnya. Setelah tersimpan, tambahkan kamar lalu ajukan verifikasi
          supaya kos ini bisa muncul di pencarian.
        </p>
      </header>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <PropertiForm labelKirim="Simpan sebagai draf" onKirim={simpan} />
      </div>
    </div>
  )
}
