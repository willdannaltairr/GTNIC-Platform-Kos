import { z } from 'zod'
import { paginationSchema, uuidSchema } from './common'

export const adminUserListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  role: z.enum(['TENANT', 'OWNER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION']).optional(),
})

export const adminUpdateUserStatusSchema = z.object({
  accountStatus: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION']),
  reason: z.string().trim().min(3).max(1000),
})
export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusSchema>

export const adminUpdateUserRoleSchema = z.object({
  role: z.enum(['TENANT', 'OWNER', 'ADMIN']),
  reason: z.string().trim().min(3).max(1000),
})
export type AdminUpdateUserRoleInput = z.infer<typeof adminUpdateUserRoleSchema>

export const ownerVerificationDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
  notes: z.string().trim().max(2000).optional(),
  documentIds: z.array(uuidSchema).max(20).optional(),
})
export type OwnerVerificationDecisionInput = z.infer<typeof ownerVerificationDecisionSchema>

export const propertyVerificationDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'SUSPENDED']),
  notes: z.string().trim().min(3).max(2000),
})
export type PropertyVerificationDecisionInput = z.infer<typeof propertyVerificationDecisionSchema>

export const adminReportUpdateSchema = z.object({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED']),
  resolutionNotes: z.string().trim().max(2000).optional(),
})
export type AdminReportUpdateInput = z.infer<typeof adminReportUpdateSchema>

export const articleCreateSchema = z.object({
  title: z.string().trim().min(5).max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens'),
  excerpt: z.string().trim().min(10).max(500),
  content: z.string().trim().min(50).max(50000),
  coverImagePath: z.string().trim().max(500).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
})
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>

export const articleUpdateSchema = articleCreateSchema.partial()
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>

export const updateSettingSchema = z.object({
  value: z.unknown(),
  description: z.string().trim().max(500).optional(),
})

export const adminVerificationListQuerySchema = paginationSchema.extend({
  status: z.enum(['NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']).optional(),
})

export const adminPropertyListQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED']).optional(),
  publicationStatus: z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']).optional(),
  q: z.string().trim().max(120).optional(),
})

export const adminAuditQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(100).optional(),
  actorId: uuidSchema.optional(),
  entityType: z.string().trim().max(80).optional(),
})

export const adminBookingListQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED']).optional(),
})

export const adminPaymentListQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED']).optional(),
})
