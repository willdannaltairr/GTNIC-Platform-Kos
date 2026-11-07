export type HouseView = 'depan' | 'samping' | 'belakang' | 'atas'

export interface OrbitState {
  yaw: number
  pitch: number
  intro: number
  lastInteraction: number
  dragging: boolean
  reduced: boolean
}

export interface ViewPreset {
  id: HouseView
  label: string
  caption: string
  yaw: number
  pitch: number
}

export const PITCH_MIN = 0.06
export const PITCH_MAX = 1.2

/**
 * Empat sisi yang bisa dipilih pengunjung.
 *
 * Sudut `yaw` disusun mengelilingi bangunan searah jarum jam bila dilihat dari
 * atas, dimulai dari fasad depan (sumbu +Z pada scene), supaya tombol Depan →
 * Samping → Belakang terasa berurutan dan bukan melompat.
 */
export const VIEWS: ViewPreset[] = [
  {
    id: 'depan',
    label: 'Depan',
    caption: 'Fasad depan: pintu masuk, teras kecil, dan jendela kamar yang menghadap jalan.',
    yaw: 0.42,
    pitch: 0.24,
  },
  {
    id: 'samping',
    label: 'Samping',
    caption: 'Dari samping, kedalaman bangunan dan jendela kamar di sisinya terlihat utuh.',
    yaw: Math.PI / 2 + 0.05,
    pitch: 0.16,
  },
  {
    id: 'belakang',
    label: 'Belakang',
    caption: 'Sisi belakang biasanya dipakai untuk jemuran dan ventilasi dapur bersama.',
    yaw: Math.PI + 0.5,
    pitch: 0.2,
  },
  {
    id: 'atas',
    label: 'Atas',
    caption: 'Dari atas, bentuk atap dan luasan bangunan terbaca dalam satu pandangan.',
    yaw: 0.25,
    pitch: 1.08,
  },
]

export const DEFAULT_VIEW = VIEWS[0]

const TAU = Math.PI * 2

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const wrapAngle = (angle: number): number => ((angle % TAU) + TAU) % TAU

/** Nilai `target` yang paling dekat dengan `current`, supaya kamera tidak memutar jauh. */
export const closestYaw = (current: number, target: number): number => {
  return current + (wrapAngle(target - current + Math.PI) - Math.PI)
}

export const nearestView = (yaw: number, pitch: number): HouseView => {
  if (pitch > 0.85) return 'atas'

  const angle = wrapAngle(yaw)

  if (Math.min(angle, TAU - angle) < Math.PI / 4) return 'depan'
  if (Math.abs(angle - Math.PI) < Math.PI / 4) return 'belakang'

  return 'samping'
}
