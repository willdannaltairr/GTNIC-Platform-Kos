import { z } from 'zod'
import {
  booleanQuery,
  dateStringSchema,
  paginationSchema,
  stringArrayQuery,
  uuidSchema,
} from './common'
import { PROPERTY_SORTS } from '../constants'

export const billingTypeSchema = z.enum(['FIXED', 'VARIABLE', 'ONE_TIME', 'MONTHLY'])
export const roomTypeSchema = z.enum(['SINGLE', 'DOUBLE', 'TWIN', 'STUDIO', 'SHARED'])
export const bathroomTypeSchema = z.enum(['INSIDE', 'OUTSIDE'])
export const roomStatusSchema = z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'])
export const propertyTypeSchema = z.enum(['KOS_PUTRA', 'KOS_PUTRI', 'KOS_CAMPUR'])
export const genderPolicySchema = z.enum(['MALE_ONLY', 'FEMALE_ONLY', 'MIXED'])

export const costComponentInputSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1).max(120),
  amount: z.coerce.number().min(0).max(1_000_000_000),
  billingType: billingTypeSchema,
  isMandatory: z.boolean().default(true),
  isRefundable: z.boolean().default(false),
  isEstimated: z.boolean().default(false),
  isConfirmed: z.boolean().default(true),
  description: z.string().trim().max(500).optional(),
  roomId: uuidSchema.nullable().optional(),
})

export const ruleInputSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  isMandatory: z.boolean().default(true),
})

export const createPropertySchema = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().min(30).max(5000),
  address: z.string().trim().min(10).max(500),
  province: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  subdistrict: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'Use a 5-digit postal code').optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  propertyType: propertyTypeSchema,
  genderPolicy: genderPolicySchema,
  facilityIds: z.array(uuidSchema).max(40).default([]),
  rules: z.array(ruleInputSchema).max(30).default([]),
  costComponents: z.array(costComponentInputSchema).max(30).default([]),
})
export type CreatePropertyInput = z.infer<typeof createPropertySchema>

export const updatePropertySchema = createPropertySchema.partial().extend({
  facilityIds: z.array(uuidSchema).max(40).optional(),
  rules: z.array(ruleInputSchema).max(30).optional(),
  costComponents: z.array(costComponentInputSchema).max(30).optional(),
})
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>

export const createRoomSchema = z.object({
  roomNumber: z.string().trim().min(1).max(30),
  roomName: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  roomType: roomTypeSchema,
  areaWidth: z.coerce.number().min(0).max(1000).optional(),
  areaLength: z.coerce.number().min(0).max(1000).optional(),
  monthlyPrice: z.coerce.number().min(0).max(1_000_000_000),
  maximumOccupants: z.coerce.number().int().min(1).max(20).default(1),
  bathroomType: bathroomTypeSchema,
  floorNumber: z.coerce.number().int().min(-5).max(100).optional(),
  facilityIds: z.array(uuidSchema).max(40).default([]),
  availabilityStatus: roomStatusSchema.default('AVAILABLE'),
})
export type CreateRoomInput = z.infer<typeof createRoomSchema>

export const updateRoomSchema = createRoomSchema.partial()
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>

export const updateAvailabilitySchema = z.object({
  availabilityStatus: roomStatusSchema,
  note: z.string().trim().max(500).optional(),
})
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>

export const propertySearchSchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  roomType: roomTypeSchema.optional(),
  bathroomType: bathroomTypeSchema.optional(),
  genderPolicy: genderPolicySchema.optional(),
  propertyType: propertyTypeSchema.optional(),
  facilities: stringArrayQuery,
  availableOnly: booleanQuery,
  sort: z.enum(PROPERTY_SORTS).default('recommended'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  destinationId: uuidSchema.optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
})
export type PropertySearchInput = z.infer<typeof propertySearchSchema>

export const compareQuerySchema = z.object({
  ids: z.preprocess((value) => {
    if (Array.isArray(value)) return value.flatMap((item) => String(item).split(',')).filter(Boolean)
    return String(value ?? '')
      .split(',')
      .filter(Boolean)
  }, z.array(uuidSchema).min(1).max(4)),
})

export const propertyRoutesQuerySchema = z.object({
  destinationId: uuidSchema.optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  mode: z.enum(['WALKING', 'MOTORCYCLE', 'CAR', 'TRANSIT']).default('MOTORCYCLE'),
})

export const reviewCreateSchema = z.object({
  bookingId: uuidSchema,
  rating: z.coerce.number().int().min(1).max(5),
  cleanlinessRating: z.coerce.number().int().min(1).max(5).optional(),
  locationRating: z.coerce.number().int().min(1).max(5).optional(),
  facilitiesRating: z.coerce.number().int().min(1).max(5).optional(),
  ownerServiceRating: z.coerce.number().int().min(1).max(5).optional(),
  content: z.string().trim().min(10).max(2000),
})
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>

export const destinationSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(['CAMPUS', 'OFFICE', 'STATION', 'TERMINAL', 'LANDMARK', 'OTHER']).optional(),
})

export const submitVerificationSchema = z.object({
  note: z.string().trim().max(1000).optional(),
})

export const uploadDocumentSchema = z.object({
  documentType: z.enum(['IDENTITY_CARD', 'SELFIE', 'BUSINESS_PERMIT', 'PROPERTY_DEED', 'CONTRACT', 'OTHER']),
})

export const expenseCreateSchema = z.object({
  propertyId: uuidSchema,
  category: z.enum(['MAINTENANCE', 'ELECTRICITY', 'WATER', 'INTERNET', 'CLEANING', 'TAX', 'OTHER']),
  description: z.string().trim().min(3).max(250),
  amount: z.coerce.number().min(0).max(1_000_000_000),
  expenseDate: dateStringSchema,
})
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>
