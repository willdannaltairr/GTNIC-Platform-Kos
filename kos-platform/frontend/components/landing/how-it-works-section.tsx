import { STEPS } from '@/lib/constants'

/** Alur penggunaan platform dari mencari sampai menempati kamar. */
export function HowItWorksSection() {
  return (
    <section id="cara-kerja" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Cara Kerja</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Empat langkah dari pencarian sampai Anda menempati kamar — masing-masing meninggalkan
          catatan yang bisa Anda buka kembali.
        </p>
      </div>

      <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <li key={step.number} className="rounded-2xl border border-border bg-card p-6">
            <span className="text-2xl font-extrabold text-leaf">{step.number}</span>
            <h3 className="mt-3 text-base font-bold tracking-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
