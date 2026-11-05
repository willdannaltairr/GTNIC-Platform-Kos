export type UserRole = 'TENANT' | 'OWNER' | 'ADMIN'
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION'

export interface ApiSuccess<T> {
  success: true
  message: string
  data: T
  meta?: PaginationMeta
}

export interface ApiFailure {
  success: false
  message: string
  code?: string
  errors?: Array<{ field: string; message: string }>
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PublicUser {
  id: string
  fullName: string
  email: string
  phoneNumber: string | null
  avatarUrl: string | null
  role: UserRole
  accountStatus: AccountStatus
  emailVerifiedAt: string | null
  createdAt: string
}

export interface FacilityDto {
  id: string
  name: string
  slug: string
  category: string
  icon: string | null
}

export interface PropertyImageDto {
  id: string
  url: string
  altText: string | null
  isPrimary: boolean
  displayOrder: number
}

export interface RoomImageDto {
  id: string
  url: string
  altText: string | null
  displayOrder: number
}

export interface CostComponentDto {
  id: string
  name: string
  amount: number
  billingType: 'FIXED' | 'VARIABLE' | 'ONE_TIME' | 'MONTHLY'
  isMandatory: boolean
  isRefundable: boolean
  isEstimated: boolean
  isConfirmed: boolean
  description: string | null
  roomId: string | null
}

export interface RoomDto {
  id: string
  propertyId: string
  roomNumber: string
  roomName: string | null
  description: string | null
  roomType: string
  areaWidth: number | null
  areaLength: number | null
  areaSqm: number | null
  monthlyPrice: number
  maximumOccupants: number
  bathroomType: 'INSIDE' | 'OUTSIDE'
  floorNumber: number | null
  availabilityStatus: string
  availabilityIsStale: boolean
  lastAvailabilityConfirmedAt: string | null
  facilities: FacilityDto[]
  images: RoomImageDto[]
}

export interface OwnerSummaryDto {
  id: string
  fullName: string
  avatarUrl: string | null
  businessName: string | null
  verificationStatus: string
  memberSince: string
}

export interface ReviewSummaryDto {
  averageRating: number | null
  count: number
}

export interface PropertyListItemDto {
  id: string
  slug: string
  name: string
  city: string
  district: string
  address: string
  propertyType: string
  genderPolicy: string
  verificationStatus: string
  publicationStatus: string
  latitude: number
  longitude: number
  coverImageUrl: string | null
  minMonthlyPrice: number
  availableRoomCount: number
  totalRoomCount: number
  facilities: FacilityDto[]
  availabilityIsStale: boolean
  lastAvailabilityConfirmedAt: string | null
  distanceKm: number | null
  reviewSummary: ReviewSummaryDto
  createdAt: string
  isFavorite?: boolean
}

export interface PropertyDetailDto extends PropertyListItemDto {
  description: string
  province: string
  subdistrict: string | null
  postalCode: string | null
  images: PropertyImageDto[]
  rooms: RoomDto[]
  costComponents: CostComponentDto[]
  rules: Array<{ id: string; title: string; description: string | null; isMandatory: boolean }>
  owner: OwnerSummaryDto
  nearbyPlaces: Array<{
    id: string
    name: string
    category: string
    address: string | null
    distanceMeters: number | null
    source: string
  }>
  reviews: Array<{
    id: string
    rating: number
    content: string
    tenantName: string
    createdAt: string
  }>
  costConfidence: string
  hasCoordinates: boolean
}

export interface DestinationDto {
  id: string
  name: string
  category: string
  address: string | null
  city: string
  latitude: number
  longitude: number
}

export interface MatchWeights {
  budget: number
  location: number
  facilities: number
  room: number
}

export interface MatchPreferences {
  destinationId?: string | null
  destinationLat?: number | null
  destinationLng?: number | null
  destinationLabel?: string | null
  maximumBudget?: number | null
  maximumDistanceKm?: number | null
  roomType?: string | null
  bathroomType?: string | null
  facilitySlugs?: string[]
  genderPolicy?: string | null
  city?: string | null
  availableOnly?: boolean
}

export interface MatchCandidate {
  propertyId: string
  slug: string
  name: string
  city: string
  district: string
  monthlyPrice: number
  distanceKm: number | null
  roomType: string | null
  bathroomType: string | null
  facilitySlugs: string[]
  availableRoomCount: number
  hasVerifiedAvailability: boolean
  coverImageUrl: string | null
}

export interface ScoreBreakdown {
  budget: number
  location: number
  facilities: number
  room: number
  total: number
}

export interface MatchResult {
  propertyId: string
  slug: string
  name: string
  city: string
  district: string
  monthlyPrice: number
  distanceKm: number | null
  coverImageUrl: string | null
  availableRoomCount: number
  score: number
  breakdown: ScoreBreakdown
  explanation: string
  matchedFacilities: string[]
  missingFacilities: string[]
  labels: string[]
}

export interface MatchResponse {
  results: MatchResult[]
  categories: {
    bestOverall: MatchResult | null
    bestBudget: MatchResult | null
    bestLocation: MatchResult | null
    bestFacilities: MatchResult | null
  }
  weights: MatchWeights
  preferences: MatchPreferences
  disclaimer: string
}

export interface CostInputComponent {
  id?: string
  name: string
  amount: number
  billingType: 'FIXED' | 'VARIABLE' | 'ONE_TIME' | 'MONTHLY'
  isMandatory?: boolean
  isRefundable?: boolean
  isEstimated?: boolean
  isConfirmed?: boolean
}

export interface CostSimulationInput {
  monthlyRent: number
  deposit?: number
  depositConfirmed?: boolean
  depositRefundable?: boolean
  components: CostInputComponent[]
  durationMonths?: 1 | 3 | 6 | 12
  monthlyBudget?: number | null
  upfrontBudget?: number | null
}

export interface CostLine {
  name: string
  amount: number
  billingType: string
  kind: 'RECURRING_FIXED' | 'RECURRING_VARIABLE' | 'ONE_TIME' | 'DEPOSIT'
  isEstimated: boolean
  isConfirmed: boolean
  isRefundable: boolean
  isMandatory: boolean
  includedInEstimate: boolean
}

export interface CostSimulationResult {
  monthlyRent: number
  deposit: number
  depositRefundable: boolean
  monthlyEstimated: number
  upfrontEstimated: number
  totals: Record<'1' | '3' | '6' | '12', number>
  fixedMonthly: number
  variableMonthly: number
  oneTimeTotal: number
  lines: CostLine[]
  unknownCosts: string[]
  confidence: 'COMPLETE' | 'PARTIAL' | 'NEEDS_CONFIRMATION'
  confidenceLabel: string
  formula: string[]
  budget: {
    monthlyBudget: number | null
    upfrontBudget: number | null
    monthlyDelta: number | null
    upfrontDelta: number | null
    status: 'WITHIN_BUDGET' | 'OVER_BUDGET' | 'NOT_EVALUATED'
  }
  disclaimer: string
}
