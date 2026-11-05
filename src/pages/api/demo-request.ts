import type { NextApiRequest, NextApiResponse } from 'next'

import { validateDemoRequest, type DemoRequestPayload } from '@/constants/demo-request'
import { query } from '@/lib/db'
import { getEmailQuota, sendEmail } from '@/lib/modulify/email'

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const readText = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '')

const readInterests = (value: unknown): Array<string> =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 8) : []

const readPayload = (body: unknown): DemoRequestPayload => {
  const source = (body ?? {}) as Record<string, unknown>

  return {
    fullName: readText(source.fullName, 200),
    workEmail: readText(source.workEmail, 320),
    company: readText(source.company, 240),
    role: readText(source.role, 80),
    portfolioSize: readText(source.portfolioSize, 80),
    interests: readInterests(source.interests),
    message: readText(source.message, 4000),
    website: readText(source.website, 200),
  }
}

interface Notification {
  subject: string
  html: string
  text: string
}

const buildNotification = (data: DemoRequestPayload, reference: string): Notification => {
  const rows: Array<[string, string]> = [
    ['Name', data.fullName],
    ['Work email', data.workEmail],
    ['Company', data.company],
    ['Role', data.role || 'Not given'],
    ['Portfolio', data.portfolioSize || 'Not given'],
    ['Interests', data.interests.join(', ') || 'Not given'],
    ['Reference', reference],
  ]

  const text = [
    'New demo request',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    data.message ? `Message:\n${data.message}` : 'No message provided.',
  ].join('\n')

  const definitionList = rows
    .map(
      ([label, value]) =>
        `<p style="margin:0 0 6px;color:#0e1a12;font-size:14px;"><strong style="color:#5c6b5e;font-weight:600;">${escapeHtml(
          label,
        )}:</strong> ${escapeHtml(value)}</p>`,
    )
    .join('')

  const message = data.message
    ? `<p style="margin:16px 0 0;padding-top:16px;border-top:1px solid #dce3d7;color:#0e1a12;font-size:14px;white-space:pre-wrap;">${escapeHtml(
        data.message,
      )}</p>`
    : ''

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;padding:24px;">
<p style="margin:0 0 12px;color:#1e8538;font-size:12px;letter-spacing:1px;text-transform:uppercase;">New demo request</p>
${definitionList}
${message}
</div>`

  return {
    subject: `New demo request from ${data.company}`,
    html,
    text,
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ message: 'Method not allowed.' })

    return
  }

  const data = readPayload(req.body)

  // Honeypot: only a bot fills a field no visitor can see. Answer as if it worked.
  if (data.website) {
    res.status(200).json({ ok: true })

    return
  }

  const errors = validateDemoRequest(data)

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ message: 'Please check the highlighted fields.', errors })

    return
  }

  let savedId: string | null = null

  try {
    const rows = await query<{ id: string }>(
      'INSERT INTO demo_requests (full_name, work_email, company, role, portfolio_size, interests, message) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [
        data.fullName,
        data.workEmail,
        data.company,
        data.role || null,
        data.portfolioSize || null,
        JSON.stringify(data.interests),
        data.message || null,
      ],
    )

    savedId = rows[0]?.id ?? null
  } catch (error) {
    console.error('Demo request could not be saved:', error instanceof Error ? error.message : error)
  }

  const reference = savedId ?? `unsaved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  let notified = false

  try {
    const { fromAddress } = await getEmailQuota()
    const notification = buildNotification(data, reference)

    await sendEmail({
      to: fromAddress,
      replyTo: data.workEmail,
      subject: notification.subject,
      html: notification.html,
      text: notification.text,
      tags: [{ name: 'type', value: 'demo-request' }],
      idempotencyKey: `demo-request-${reference}`,
    })

    notified = true
  } catch (error) {
    console.error('Demo request notification could not be sent:', error instanceof Error ? error.message : error)
  }

  if (!savedId && !notified) {
    res.status(500).json({ message: 'We could not send your request just now. Please try again in a moment.' })

    return
  }

  res.status(200).json({ ok: true })
}

export default handler
