import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingGate } from '@/components/landing/landing-gate'
import { LandingHeader } from '@/components/landing/landing-header'

/**
 * Chrome khusus landing page.
 *
 * Dipisahkan dari (site)/layout.tsx supaya desain landing bisa memakai bahasa
 * visualnya sendiri tanpa mengubah header dan footer halaman /kos,
 * /masuk dan /daftar.
 *
 * Kelas `landing-scope` menukar tipografi hanya di dalam pohon ini, di luar
 * sini halaman lain tetap memakai Plus Jakarta Sans.
 *
 * LandingGate memindahkan pengunjung yang sudah punya akun ke beranda: landing
 * adalah halaman perkenalan, dan yang sudah masuk tidak perlu diperkenalkan
 * lagi setiap kali membuka alamat utama.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-scope flex flex-1 flex-col">
      <LandingGate />
      <LandingHeader />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <LandingFooter />
    </div>
  )
}
