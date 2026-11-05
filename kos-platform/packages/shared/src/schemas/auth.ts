import { z } from 'zod'
import { emailSchema, passwordSchema, phoneSchema, uuidSchema } from './common'

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: emailSchema,
  password: passwordSchema,
  phoneNumber: phoneSchema.optional(),
  role: z.enum(['TENANT', 'OWNER']),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
})
export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({ email: emailSchema })
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema,
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const verifyEmailSchema = z.object({
  token: z.string().min(32).max(128),
})
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  phoneNumber: phoneSchema.nullable().optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const updateOwnerProfileSchema = z.object({
  businessName: z.string().trim().max(150).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
})
export type UpdateOwnerProfileInput = z.infer<typeof updateOwnerProfileSchema>

export const updateTenantProfileSchema = z.object({
  occupation: z.string().trim().max(100).nullable().optional(),
  institutionName: z.string().trim().max(150).nullable().optional(),
  emergencyContactName: z.string().trim().max(150).nullable().optional(),
  emergencyContactPhone: phoneSchema.nullable().optional(),
})
export type UpdateTenantProfileInput = z.infer<typeof updateTenantProfileSchema>

export const notificationPreferenceSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  bookingNotifications: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
  maintenanceNotifications: z.boolean().optional(),
  marketingNotifications: z.boolean().optional(),
})
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>

export const notificationListQuerySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const markNotificationReadSchema = z.object({ id: uuidSchema })
