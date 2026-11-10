import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SimulasiBiaya } from '@/components/tools/simulasi-biaya'

export const metadata: Metadata = {
  title: 'Simulasi biaya total',
  description:
    'Hitung biaya tinggal di kos selama sekian bulan, lengkap dengan komponen bulanan, biaya sekali bayar, dan deposit yang dikembalikan.',
}

/**
 * Halaman simulasi biaya.
 *
 * Isinya komponen klien karena pilihan kos dan lama tinggalnya berubah di
 * peramban, dan halaman itu membaca `?kos=` lewat `useSearchParams`. Next
 * menuntut pemakaian `useSearchParams` berada di dalam batas Suspense, jadi
 * pembungkusnya ada di sini, bukan di dalam komponennya.
 */
export default function SimulasiBiayaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-6 h-72 animate-pulse rounded-3xl bg-muted" />
        </div>
      }
    >
      <SimulasiBiaya />
    </Suspense>
  )
}
