export type SolarView = 'front' | 'side' | 'back' | 'top'

export interface OrbitState {
  yaw: number
  pitch: number
  intro: number
  lastInteraction: number
  dragging: boolean
  reduced: boolean
}

export interface ViewPreset {
  id: SolarView
  label: string
  caption: string
  yaw: number
  pitch: number
}

export const PITCH_MIN = 0.05
export const PITCH_MAX = 1.3

export const VIEWS: ViewPreset[] = [
  {
    id: 'front',
    label: 'Front',
    caption: 'Six panels angled at 24 degrees to catch the midday sun.',
    yaw: 0.5,
    pitch: 0.3,
  },
  {
    id: 'side',
    label: 'Side',
    caption: 'Concrete ballast holds the frame in place, with no foundations to dig.',
    yaw: Math.PI / 2 + 0.05,
    pitch: 0.14,
  },
  {
    id: 'back',
    label: 'Back',
    caption: 'Gridora reads every string through the junction boxes on the back.',
    yaw: Math.PI + 0.55,
    pitch: 0.2,
  },
  {
    id: 'top',
    label: 'Top',
    caption: 'From above, the whole string reads as one forecast.',
    yaw: 0.25,
    pitch: 1.22,
  },
]

export const DEFAULT_VIEW = VIEWS[0]

const TAU = Math.PI * 2

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const wrapAngle = (angle: number): number => ((angle % TAU) + TAU) % TAU

// The equivalent of `target` that is the shortest turn away from `current`.
export const closestYaw = (current: number, target: number): number => {
  return current + (wrapAngle(target - current + Math.PI) - Math.PI)
}

export const nearestView = (yaw: number, pitch: number): SolarView => {
  if (pitch > 0.9) return 'top'

  const angle = wrapAngle(yaw)

  if (Math.min(angle, TAU - angle) < Math.PI / 4) return 'front'
  if (Math.abs(angle - Math.PI) < Math.PI / 4) return 'back'

  return 'side'
}
