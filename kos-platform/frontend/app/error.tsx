'use client'

import { SiteChrome } from '@/components/site-chrome'

/**
 * Halaman 500.
 *
 * Berada di luar route group, jadi chrome-nya dipasang langsung agar header
 * dan footer tetap tampil seperti sebelumnya.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <SiteChrome>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-4 text-center">
        <h2 className="text-lg font-medium">Terjadi kesalahan</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Coba lagi
        </button>
      </div>
    </SiteChrome>
  )
}
