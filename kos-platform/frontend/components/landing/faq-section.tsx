import { ChevronDown } from 'lucide-react'
import { FAQS } from '@/lib/constants'

/** Tanya jawab memakai elemen <details> agar tetap berfungsi tanpa JS. */
export function FaqSection() {
  return (
    <section id="tanya-jawab" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Tanya Jawab</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Pertanyaan yang paling sering muncul sebelum orang memesan kos lewat platform.
      </p>

      <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              {faq.question}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
