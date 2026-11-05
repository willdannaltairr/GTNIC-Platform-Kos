/** Kerangka pemuatan halaman pencarian: enam kartu kosong. */
export default function LoadingKos() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="h-8 w-52 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-muted" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="hidden h-[560px] animate-pulse rounded-2xl bg-muted lg:block" />
        <div>
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
