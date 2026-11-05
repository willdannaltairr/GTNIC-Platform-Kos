export interface ChartPoint {
  x: number
  y: number
}

interface CubicSegment {
  from: ChartPoint
  c1: ChartPoint
  c2: ChartPoint
  to: ChartPoint
}

const round = (value: number): number => Math.round(value * 100) / 100

const point = (p: ChartPoint): string => `${round(p.x)},${round(p.y)}`

/**
 * Monotone cubic interpolation: the curve passes through every point without
 * overshooting between them, so a load forecast never dips below the values it
 * was given. Tangents are zeroed at local extremes for the same reason.
 */
const monotoneSegments = (points: ChartPoint[]): CubicSegment[] => {
  const count = points.length
  if (count < 2) return []

  const dx: number[] = []
  const slopes: number[] = []

  for (let index = 0; index < count - 1; index++) {
    dx.push(points[index + 1].x - points[index].x)
    slopes.push((points[index + 1].y - points[index].y) / dx[index])
  }

  const tangents: number[] = new Array(count).fill(0)

  for (let index = 1; index < count - 1; index++) {
    const before = slopes[index - 1]
    const after = slopes[index]

    if (before * after <= 0) {
      tangents[index] = 0
    } else {
      const weightA = 2 * dx[index] + dx[index - 1]
      const weightB = dx[index] + 2 * dx[index - 1]

      tangents[index] = (weightA + weightB) / (weightA / before + weightB / after)
    }
  }

  const segments: CubicSegment[] = []

  for (let index = 0; index < count - 1; index++) {
    const third = dx[index] / 3
    const from = points[index]
    const to = points[index + 1]

    segments.push({
      from,
      c1: { x: from.x + third, y: from.y + third * tangents[index] },
      c2: { x: to.x - third, y: to.y - third * tangents[index + 1] },
      to,
    })
  }

  return segments
}

export const linePath = (points: ChartPoint[]): string => {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${point(points[0])}`

  const segments = monotoneSegments(points)

  return segments.reduce(
    (path, segment) => `${path}C${point(segment.c1)} ${point(segment.c2)} ${point(segment.to)}`,
    `M${point(points[0])}`,
  )
}

export const areaToBaselinePath = (points: ChartPoint[], baseline: number): string => {
  if (points.length < 2) return ''

  const first = points[0]
  const last = points[points.length - 1]

  return `${linePath(points)}L${round(last.x)},${round(baseline)}L${round(first.x)},${round(baseline)}Z`
}

export const bandPath = (upper: ChartPoint[], lower: ChartPoint[]): string => {
  if (upper.length < 2 || lower.length < 2) return ''

  const reversed = monotoneSegments(lower).reverse()
  const lowerLast = lower[lower.length - 1]

  const back = reversed.reduce(
    (path, segment) => `${path}C${point(segment.c2)} ${point(segment.c1)} ${point(segment.from)}`,
    `L${point(lowerLast)}`,
  )

  return `${linePath(upper)}${back}Z`
}
