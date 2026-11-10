/**
 * Permintaan gulir untuk tautan jangkar.
 *
 * Bagian yang memakai guliran tersemat kadang perlu menentukan sendiri posisi
 * tujuan sebuah jangkar. Penggulungan halaman mengirim permintaan ini ke elemen
 * tujuan lebih dulu; bila ada yang membatalkannya, penggulungan bawaan tidak
 * dijalankan dan bagian tersebut yang mengatur posisinya.
 */
export const ANCHOR_SCROLL_EVENT = 'HuniKos:anchor-scroll'

export interface AnchorScrollDetail {
  /** Nama jangkar tanpa tanda pagar. */
  hash: string
  /** Meluncurkan halaman ke posisi dokumen tertentu. */
  scrollTo: (top: number) => void
}

/**
 * Menawarkan tujuan jangkar kepada elemen dan isinya.
 *
 * @returns `true` bila ada penangan yang mengambil alih tujuan gulir.
 */
export const requestAnchorScroll = (target: Element, detail: AnchorScrollDetail): boolean => {
  const event = new CustomEvent<AnchorScrollDetail>(ANCHOR_SCROLL_EVENT, {
    bubbles: true,
    cancelable: true,
    detail,
  })

  target.dispatchEvent(event)

  return event.defaultPrevented
}
