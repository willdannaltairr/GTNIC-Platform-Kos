export default function NotFound(): JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 text-center p-4">
      <h2 className="text-lg font-medium">Halaman tidak ditemukan</h2>
      <a href="/" className="rounded-md border px-4 py-2 text-sm">
        Kembali ke beranda
      </a>
    </div>
  )
}
