import Link from 'next/link'

/** Navigasi halaman untuk daftar hasil, mempertahankan seluruh filter aktif. */
export function Pagination({
  basePath,
  query,
  page,
  totalPages,
}: {
  basePath: string
  query: Record<string, string>
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(query)
    params.set('page', String(target))
    return `${basePath}?${params.toString()}`
  }

  const linkClass =
    'rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted'
  const disabledClass =
    'rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground opacity-50'

  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Navigasi halaman">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass}>
          ← Sebelumnya
        </Link>
      ) : (
        <span className={disabledClass}>← Sebelumnya</span>
      )}

      <span className="text-xs text-muted-foreground">
        Halaman {page} dari {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={linkClass}>
          Berikutnya →
        </Link>
      ) : (
        <span className={disabledClass}>Berikutnya →</span>
      )}
    </nav>
  )
}
