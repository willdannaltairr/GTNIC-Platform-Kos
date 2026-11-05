import { DEFAULT_MATCH_WEIGHTS } from './constants'
import type {
  MatchCandidate,
  MatchPreferences,
  MatchResponse,
  MatchResult,
  MatchWeights,
  ScoreBreakdown,
} from './types'

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const round = (value: number) => Math.round(value * 10) / 10

export function normaliseWeights(input?: Partial<MatchWeights> | null): MatchWeights {
  const merged = {
    budget: input?.budget ?? DEFAULT_MATCH_WEIGHTS.budget,
    location: input?.location ?? DEFAULT_MATCH_WEIGHTS.location,
    facilities: input?.facilities ?? DEFAULT_MATCH_WEIGHTS.facilities,
    room: input?.room ?? DEFAULT_MATCH_WEIGHTS.room,
  }
  const safe = {
    budget: Number.isFinite(merged.budget) ? Math.max(0, merged.budget) : 0,
    location: Number.isFinite(merged.location) ? Math.max(0, merged.location) : 0,
    facilities: Number.isFinite(merged.facilities) ? Math.max(0, merged.facilities) : 0,
    room: Number.isFinite(merged.room) ? Math.max(0, merged.room) : 0,
  }
  const sum = safe.budget + safe.location + safe.facilities + safe.room
  if (sum <= 0) return { ...DEFAULT_MATCH_WEIGHTS }
  return {
    budget: safe.budget / sum,
    location: safe.location / sum,
    facilities: safe.facilities / sum,
    room: safe.room / sum,
  }
}

function scoreBudget(price: number, maximumBudget?: number | null): number {
  if (!maximumBudget || maximumBudget <= 0) return 70
  if (price <= maximumBudget) return 100
  const overRatio = (price - maximumBudget) / maximumBudget
  return clamp(100 - overRatio * 250)
}

function scoreLocation(distanceKm: number | null, maximumDistanceKm?: number | null): number {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return 40
  if (maximumDistanceKm && maximumDistanceKm > 0) {
    if (distanceKm <= maximumDistanceKm * 0.5) return 100
    if (distanceKm <= maximumDistanceKm) {
      return clamp(100 - ((distanceKm - maximumDistanceKm * 0.5) / (maximumDistanceKm * 0.5)) * 30)
    }
    const overRatio = (distanceKm - maximumDistanceKm) / maximumDistanceKm
    return clamp(70 - overRatio * 70)
  }
  return clamp(100 - Math.min(distanceKm, 30) * (50 / 30))
}

function scoreFacilities(
  candidateFacilities: string[],
  requiredFacilities: string[],
): { score: number; matched: string[]; missing: string[] } {
  if (requiredFacilities.length === 0) {
    return { score: 70, matched: [], missing: [] }
  }
  const set = new Set(candidateFacilities)
  const matched = requiredFacilities.filter((slug) => set.has(slug))
  const missing = requiredFacilities.filter((slug) => !set.has(slug))
  return {
    score: (matched.length / requiredFacilities.length) * 100,
    matched,
    missing,
  }
}

function scoreRoom(
  candidate: MatchCandidate,
  preferences: MatchPreferences,
): number {
  const parts: number[] = []
  if (preferences.roomType) {
    if (!candidate.roomType) parts.push(25)
    else parts.push(candidate.roomType === preferences.roomType ? 100 : 0)
  }
  if (preferences.bathroomType) {
    if (!candidate.bathroomType) parts.push(25)
    else parts.push(candidate.bathroomType === preferences.bathroomType ? 100 : 0)
  }
  if (parts.length === 0) return 70
  return parts.reduce((sum, value) => sum + value, 0) / parts.length
}

function buildExplanation(
  candidate: MatchCandidate,
  preferences: MatchPreferences,
  breakdown: ScoreBreakdown,
  matched: string[],
  missing: string[],
): string {
  const sentences: string[] = []

  if (preferences.maximumBudget) {
    const budget = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(preferences.maximumBudget)
    if (candidate.monthlyPrice <= preferences.maximumBudget) {
      sentences.push(`The monthly price fits your ${budget} budget.`)
    } else {
      sentences.push(`The price is above your ${budget} budget, so the budget score is reduced.`)
    }
  }

  if (candidate.distanceKm !== null) {
    const label = preferences.destinationLabel ? ` from ${preferences.destinationLabel}` : ''
    sentences.push(
      `It is about ${candidate.distanceKm.toFixed(1)} km${label} (straight-line estimate; travel time varies with traffic).`,
    )
  } else if (preferences.destinationLat != null) {
    sentences.push('Distance could not be calculated because the property has no usable coordinates.')
  }

  if (preferences.facilitySlugs && preferences.facilitySlugs.length > 0) {
    if (missing.length === 0) {
      sentences.push(`All ${matched.length} required facilities are available.`)
    } else if (matched.length > 0) {
      sentences.push(
        `${matched.length} of ${preferences.facilitySlugs.length} required facilities match; missing: ${missing.join(', ')}.`,
      )
    } else {
      sentences.push('None of the required facilities are listed by the owner.')
    }
  }

  if (preferences.roomType || preferences.bathroomType) {
    const roomBits: string[] = []
    if (preferences.roomType) {
      roomBits.push(candidate.roomType === preferences.roomType ? `room type ${candidate.roomType}` : 'a different room type')
    }
    if (preferences.bathroomType) {
      roomBits.push(
        candidate.bathroomType === preferences.bathroomType
          ? `${candidate.bathroomType.toLowerCase()} bathroom`
          : 'a different bathroom type',
      )
    }
    sentences.push(`Room preference check: ${roomBits.join(', ')}.`)
  }

  if (!candidate.hasVerifiedAvailability) {
    sentences.push('Availability is not recently confirmed by the owner; verify it before booking.')
  }

  sentences.push(`Weighted match score: ${breakdown.total.toFixed(1)}/100 (estimate, not a quality guarantee).`)
  return sentences.join(' ')
}

export function scoreCandidate(
  candidate: MatchCandidate,
  preferences: MatchPreferences,
  weightsInput?: Partial<MatchWeights> | null,
): MatchResult {
  const weights = normaliseWeights(weightsInput)
  const budget = scoreBudget(candidate.monthlyPrice, preferences.maximumBudget)
  const location = scoreLocation(candidate.distanceKm, preferences.maximumDistanceKm)
  const facility = scoreFacilities(candidate.facilitySlugs, preferences.facilitySlugs ?? [])
  const room = scoreRoom(candidate, preferences)
  const total =
    budget * weights.budget +
    location * weights.location +
    facility.score * weights.facilities +
    room * weights.room

  const breakdown: ScoreBreakdown = {
    budget: round(budget),
    location: round(location),
    facilities: round(facility.score),
    room: round(room),
    total: round(total),
  }

  return {
    propertyId: candidate.propertyId,
    slug: candidate.slug,
    name: candidate.name,
    city: candidate.city,
    district: candidate.district,
    monthlyPrice: candidate.monthlyPrice,
    distanceKm: candidate.distanceKm,
    coverImageUrl: candidate.coverImageUrl,
    availableRoomCount: candidate.availableRoomCount,
    score: breakdown.total,
    breakdown,
    explanation: buildExplanation(candidate, preferences, breakdown, facility.matched, facility.missing),
    matchedFacilities: facility.matched,
    missingFacilities: facility.missing,
    labels: [],
  }
}

export function buildMatchResponse(
  candidates: MatchCandidate[],
  preferences: MatchPreferences,
  weightsInput?: Partial<MatchWeights> | null,
): MatchResponse {
  const weights = normaliseWeights(weightsInput)
  const scored = candidates
    .map((candidate) => scoreCandidate(candidate, preferences, weights))
    .sort((a, b) => b.score - a.score)

  const bestOverall = scored[0] ?? null
  const budgetPool = scored.filter((item) => item.breakdown.budget > 0)
  const bestBudget = [...budgetPool].sort((a, b) => {
    if (b.breakdown.budget !== a.breakdown.budget) return b.breakdown.budget - a.breakdown.budget
    return a.monthlyPrice - b.monthlyPrice
  })[0] ?? null
  const locationPool = scored.filter((item) => item.distanceKm !== null)
  const bestLocation = [...locationPool].sort((a, b) => b.breakdown.location - a.breakdown.location)[0] ?? null
  const facilitiesPool =
    preferences.facilitySlugs && preferences.facilitySlugs.length > 0 ? scored : []
  const bestFacilities = [...facilitiesPool].sort((a, b) => b.breakdown.facilities - a.breakdown.facilities)[0] ?? null

  const labelled = scored.map((item) => {
    const labels: string[] = []
    if (bestOverall && item.propertyId === bestOverall.propertyId) labels.push('Best overall')
    if (bestBudget && item.propertyId === bestBudget.propertyId) labels.push('Best budget')
    if (bestLocation && item.propertyId === bestLocation.propertyId) labels.push('Best location')
    if (bestFacilities && item.propertyId === bestFacilities.propertyId) labels.push('Best facilities')
    return { ...item, labels }
  })

  const byId = new Map(labelled.map((item) => [item.propertyId, item]))
  const pick = (item: MatchResult | null) => (item ? byId.get(item.propertyId) ?? null : null)

  return {
    results: labelled,
    categories: {
      bestOverall: pick(bestOverall),
      bestBudget: pick(bestBudget),
      bestLocation: pick(bestLocation),
      bestFacilities: pick(bestFacilities),
    },
    weights,
    preferences,
    disclaimer:
      'KosMatch is a transparent weighted-scoring rule set, not AI. Scores are estimated compatibility, not a guarantee of quality or availability.',
  }
}
