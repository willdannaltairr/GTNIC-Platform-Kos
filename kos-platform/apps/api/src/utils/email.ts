import { env, isTest } from '../config/env'
import { logger } from '../config/logger'

interface EmailPayload {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (isTest) return

  if (env.EMAIL_DRIVER === 'console' || !env.RESEND_API_KEY) {
    logger.info(
      { to: payload.to, subject: payload.subject },
      `[email:console] ${payload.text}`,
    )
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    logger.error({ status: response.status, body }, 'Resend email delivery failed')
  }
}

export function frontendUrl(path: string): string {
  const base = env.WEB_ORIGIN.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = frontendUrl(`/reset-password?token=${encodeURIComponent(token)}`)
  await sendEmail({
    to,
    subject: 'Reset your Nestari password',
    text: `Use this one-time link to reset your password (valid for ${env.PASSWORD_RESET_TTL_MINUTES} minutes): ${link}\n\nIf you did not request this, ignore this email.`,
  })
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = frontendUrl(`/verify-email?token=${encodeURIComponent(token)}`)
  await sendEmail({
    to,
    subject: 'Verify your Nestari email',
    text: `Confirm your email address (valid for ${env.EMAIL_VERIFICATION_TTL_HOURS} hours): ${link}`,
  })
}
