import { LandingHeader } from '@/components/landing/landing-header'
import { LandingFooter } from '@/components/landing/landing-footer'

/**
 * Chrome khusus landing page.
 *
 * Dipisahkan dari (site)/layout.tsx supaya desain landing bisa memakai bahasa
 * visualnya sendiri tanpa mengubah header dan footer halaman /kos,
 * /masuk, /daftar, dan /kredit.
 *
 * Kelas `landing-scope` menukar tipografi hanya di dalam pohon ini — di luar
 * sini halaman lain tetap memakai Plus Jakarta Sans.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-scope flex flex-1 flex-col">
      <LandingHeader />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <LandingFooter />
    </div>
  )
}
