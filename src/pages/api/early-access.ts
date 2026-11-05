import type { NextApiRequest, NextApiResponse } from 'next'

import { query } from '@/lib/db'
import { getEmailQuota, sendEmail } from '@/lib/modulify/email'

const EMAIL_PATTERN = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/

const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

const attempts = new Map<string, Array<number>>()

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const clientKey = (req: NextApiRequest): string => {
  const forwarded = req.headers['x-forwarded-for']
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded

  return (first?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown').trim()
}

// In-memory limiter: right for a single instance, and deliberately generous so a
// shared office address can still sign up several people.
const isRateLimited = (key: string): boolean => {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((at) => now - at < WINDOW_MS)

  recent.push(now)
  attempts.set(key, recent)

  if (attempts.size > 5000) {
    for (const [entry, times] of attempts) {
      if (times.every((at) => now - at >= WINDOW_MS)) attempts.delete(entry)
    }
  }

  return recent.length > MAX_ATTEMPTS
}

const buildSignupEmail = (email: string) => {
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;padding:24px;">
<p style="margin:0 0 8px;color:#1e8538;font-size:12px;letter-spacing:1px;text-transform:uppercase;">New early access signup</p>
<p style="margin:0;color:#0e1a12;font-size:16px;">${escapeHtml(email)} wants to hear from you. Reply to this email to answer them directly.</p>
</div>`

  return {
    subject: `New early access signup: ${email}`,
    html,
    text: `New early access signup: ${email}\n\nReply to this email to answer them directly.`,
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ message: 'Method not allowed.' })

    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>

  // Honeypot: only a bot fills a field no visitor can see.
  if (typeof body.website === 'string' && body.website.trim()) {
    res.status(200).json({ ok: true })

    return
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''

  if (!EMAIL_PATTERN.test(email) || email.length > 200) {
    res.status(400).json({ message: 'Please enter a valid work email.' })

    return
  }

  if (isRateLimited(clientKey(req))) {
    res.status(429).json({ message: 'Too many attempts. Please try again in a few minutes.' })

    return
  }

  let savedId: string | null = null
  let alreadyListed = false

  try {
    const rows = await query<{ id: string }>(
      'INSERT INTO early_access_signups (email) VALUES (?) ON CONFLICT (email) DO NOTHING RETURNING id',
      [email],
    )

    savedId = rows[0]?.id ?? null
    alreadyListed = !savedId
  } catch (error) {
    console.error('Early access signup could not be saved:', error instanceof Error ? error.message : error)
  }

  if (alreadyListed) {
    res.status(200).json({ ok: true })

    return
  }

  const reference = savedId ?? `unsaved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  let notified = false

  try {
    const { fromAddress } = await getEmailQuota()
    const message = buildSignupEmail(email)

    await sendEmail({
      to: fromAddress,
      replyTo: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: 'type', value: 'early-access' }],
      idempotencyKey: `early-access-${reference}`,
    })

    notified = true
  } catch (error) {
    console.error('Early access notification could not be sent:', error instanceof Error ? error.message : error)
  }

  if (!savedId && !notified) {
    res.status(500).json({ message: 'We could not save your email just now. Please try again in a moment.' })

    return
  }

  res.status(200).json({ ok: true })
}

export default handler
