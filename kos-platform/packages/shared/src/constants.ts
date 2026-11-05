export const APP_NAME = 'Nestari'
export const API_PREFIX = '/api/v1'
export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 50
export const MAX_COMPARE_ITEMS = 4
export const SESSION_COOKIE = 'nestari_session'
export const BOOKING_EXPIRY_HOURS = 48
export const AVAILABILITY_FRESH_DAYS = 14
export const BRAND_COLORS = {
  primary: '#172B4D',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
  lightBlue: '#EAF2FF',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
} as const

export const PUBLIC_ROLES = ['TENANT', 'OWNER'] as const
export const USER_ROLES = ['TENANT', 'OWNER', 'ADMIN'] as const

export const ACTIVE_BOOKING_STATUSES = [
  'PENDING',
  'APPROVED',
  'AWAITING_PAYMENT',
  'CONFIRMED',
] as const

export const PROPERTY_SORTS = [
  'recommended',
  'price_asc',
  'price_desc',
  'newest',
  'distance',
  'rating',
] as const

export const DEFAULT_MATCH_WEIGHTS = {
  budget: 0.35,
  location: 0.3,
  facilities: 0.2,
  room: 0.15,
} as const

export const COST_CONFIDENCE = {
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL',
  NEEDS_CONFIRMATION: 'NEEDS_CONFIRMATION',
} as const

export const COST_CONFIDENCE_LABELS = {
  COMPLETE: 'Complete',
  PARTIAL: 'Partial',
  NEEDS_CONFIRMATION: 'Needs confirmation',
} as const

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  AWAITING_PAYMENT: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  COMPLETED: 'Completed',
}

export const ROOM_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
  INACTIVE: 'Inactive',
}

export const VERIFICATION_LABELS: Record<string, string> = {
  PENDING: 'Pending verification',
  UNDER_REVIEW: 'Under review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
}

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  REVIEWING: 'Reviewing',
  IN_PROGRESS: 'In progress',
  WAITING_FOR_PARTS: 'Waiting for parts',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
}

export const FACILITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  ac: 'AC',
  private_bathroom: 'Private bathroom',
  shared_bathroom: 'Shared bathroom',
  bed: 'Bed',
  wardrobe: 'Wardrobe',
  desk: 'Study desk',
  motorcycle_parking: 'Motorcycle parking',
  car_parking: 'Car parking',
  kitchen: 'Kitchen',
  laundry: 'Laundry',
  cctv: 'CCTV',
  security_guard: 'Security guard',
  access_24h: '24-hour access',
  electricity_included: 'Electricity included',
  water_included: 'Water included',
}

export const DEFAULT_VISIT_CHECKLIST = [
  'Room cleanliness',
  'Ventilation',
  'Lighting',
  'Wall condition',
  'Floor condition',
  'Doors and windows',
  'Furniture condition',
  'Wi-Fi signal',
  'Water supply',
  'Electrical outlets',
  'Bathroom condition',
  'Parking space',
  'Kitchen access',
  'Laundry access',
  'Neighbourhood safety',
  'Noise level',
  'Public transport access',
  'Distance to daily destinations',
  'Rent price confirmed',
  'Deposit confirmed',
  'Electricity cost confirmed',
  'Water cost confirmed',
  'Extra fees confirmed',
] as const

export const DEFAULT_CONDITION_CHECKLIST = [
  'Walls',
  'Floor',
  'Door',
  'Window',
  'Bed',
  'Wardrobe',
  'Desk',
  'Air conditioner',
  'Bathroom',
  'Lighting',
  'Electrical outlets',
  'Water installation',
] as const

export const DESTINATION_CATEGORY_LABELS: Record<string, string> = {
  CAMPUS: 'Campus',
  OFFICE: 'Office',
  STATION: 'Station',
  TERMINAL: 'Terminal',
  LANDMARK: 'Landmark',
  OTHER: 'Other',
}

export const REPORT_CATEGORY_LABELS: Record<string, string> = {
  INCORRECT_INFORMATION: 'Incorrect information',
  PRICE_TRANSPARENCY: 'Price not transparent',
  UNAVAILABLE_PROPERTY: 'Property unavailable',
  FRAUD_SUSPICION: 'Suspected fraud',
  INAPPROPRIATE_BEHAVIOR: 'Inappropriate behaviour',
  PAYMENT_ISSUE: 'Payment issue',
  SERVICE_ISSUE: 'Service issue',
  OTHER: 'Other',
}
