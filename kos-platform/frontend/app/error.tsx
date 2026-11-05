'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
      <h2 className="text-lg font-medium">Terjadi kesalahan</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-md border px-4 py-2 text-sm"
      >
        Coba lagi
      </button>
    </div>
  )
}
