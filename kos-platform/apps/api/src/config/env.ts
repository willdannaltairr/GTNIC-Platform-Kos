import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: '.env' })
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', override: true })
}

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1).optional(),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SESSION_COOKIE_NAME: z.string().default('nestari_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(180).default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),

  STORAGE_DRIVER: z.enum(['local', 'cloudinary', 'supabase']).default('local'),
  LOCAL_STORAGE_ROOT: z.string().default('./storage'),
  PUBLIC_UPLOAD_BASE_URL: z.string().default('http://localhost:4000/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().min(1).max(25).default(5),

  MIDTRANS_SERVER_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  MIDTRANS_CLIENT_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  MIDTRANS_IS_PRODUCTION: z.preprocess(
    (value) => value === 'true' || value === true,
    z.boolean().default(false),
  ),
  ALLOW_PAYMENT_SIMULATION: z.preprocess(
    (value) => value === 'true' || value === true,
    z.boolean().default(false),
  ),

  GOOGLE_MAPS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),

  EMAIL_DRIVER: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.string().default('no-reply@nestari.local'),

  CLOUDINARY_CLOUD_NAME: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  CLOUDINARY_API_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_ANON_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),

  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().optional()),
  LOG_LEVEL: z.string().default('info'),
  SEED_PASSWORD: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
  throw new Error(`Invalid environment configuration:\n${details}`)
}

export const env = parsed.data
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
export const isDevelopment = env.NODE_ENV === 'development'
