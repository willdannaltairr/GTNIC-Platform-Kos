const EARTH_RADIUS_KM = 6371.0088

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export function travelEstimate(distanceKm: number, mode: string): {
  minutes: number
  label: string
  disclaimer: string
} {
  const speeds: Record<string, number> = {
    WALKING: 4.5,
    MOTORCYCLE: 24,
    CAR: 20,
    TRANSIT: 16,
  }
  const speed = speeds[mode] ?? 24
  const minutes = Math.max(1, Math.round((distanceKm / speed) * 60))
  return {
    minutes,
    label: `${minutes} min by ${mode.toLowerCase()}`,
    disclaimer:
      'Estimated from straight-line distance and an average speed. Actual travel time changes with traffic, route and transport availability.',
  }
}

export function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111.32
  const lngDelta = radiusKm / (111.32 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}
