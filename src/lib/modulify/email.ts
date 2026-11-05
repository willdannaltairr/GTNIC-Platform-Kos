type EmailRecipients = string | Array<string>

export interface EmailAttachment {
  filename: string
  content: string
  contentType?: string
}

export interface EmailTag {
  name: string
  value: string
}

export interface SendEmailOptions {
  to: EmailRecipients
  cc?: EmailRecipients
  bcc?: EmailRecipients
  subject: string
  html?: string
  text?: string
  replyTo?: EmailRecipients
  fromName?: string
  attachments?: Array<EmailAttachment>
  headers?: Record<string, string>
  tags?: Array<EmailTag>
  idempotencyKey?: string
}

export interface SendEmailResult {
  id: string
  status: string
}

export interface EmailDetail {
  id: string
  to: Array<string>
  subject: string
  status: string
  createdAt: string
}

export interface ListEmailsOptions {
  limit?: number
  cursor?: string
  status?: string
  recipient?: string
  engagement?: string
}

export interface ListEmailsResult {
  emails: Array<EmailDetail>
  nextCursor: string | null
}

export interface EmailQuotaResult {
  fromAddress: string
  sent: number
  limit: number
  remaining: number
}

export class EmailError extends Error {
  status: number
  data: unknown
  retryAfter: number | null
  idempotencyKey: string | null

  constructor(message: string, status: number, data: unknown, retryAfter: number | null) {
    super(message)
    this.name = 'EmailError'
    this.status = status
    this.data = data
    this.retryAfter = retryAfter
    this.idempotencyKey = null
  }
}

const TIMEOUT_MS = 15000

const assertServer = (): void => {
  if (typeof window !== 'undefined') {
    throw new Error('The email helper can only run on the server.')
  }
}

const readConfig = (): { baseUrl: string; token: string } => {
  const baseUrl = process.env.EMAIL_API_URL
  const token = process.env.EMAIL_API_TOKEN

  if (!baseUrl || !token) {
    throw new Error('The email service is not configured.')
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ''), token }
}

const toRecipients = (value: EmailRecipients | undefined): Array<string> | undefined => {
  if (value === undefined) return undefined

  const list = (Array.isArray(value) ? value : [value]).map((entry) => entry.trim()).filter((entry) => entry.length > 0)

  return list.length > 0 ? list : undefined
}

const readMessage = (payload: unknown, status: number): string => {
  if (payload && typeof payload === 'object') {
    const message =
      (payload as { message?: unknown; error?: unknown }).message ?? (payload as { error?: unknown }).error

    if (typeof message === 'string' && message.trim()) return message
  }

  return `The email service responded with status ${status}.`
}

const readRetryAfter = (response: Response): number | null => {
  const header = response.headers.get('retry-after')
  if (!header) return null

  const seconds = Number.parseInt(header, 10)

  return Number.isFinite(seconds) ? seconds : null
}

const request = async <T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> => {
  assertServer()

  const { baseUrl, token } = readConfig()

  let response: Response

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'

    throw new EmailError(`The email service could not be reached: ${reason}`, 0, null, null)
  }

  const payload = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new EmailError(readMessage(payload, response.status), response.status, payload, readRetryAfter(response))
  }

  return payload as T
}

export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailResult> => {
  assertServer()

  const idempotencyKey = options.idempotencyKey?.trim() || undefined
  const headers: Record<string, string> = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}

  try {
    return await request<SendEmailResult>(
      '/send',
      {
        to: toRecipients(options.to),
        cc: toRecipients(options.cc),
        bcc: toRecipients(options.bcc),
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: toRecipients(options.replyTo),
        fromName: options.fromName,
        attachments: options.attachments,
        headers: options.headers,
        tags: options.tags,
      },
      headers,
    )
  } catch (error) {
    if (error instanceof EmailError) error.idempotencyKey = idempotencyKey ?? null

    throw error
  }
}

export const getEmail = async (id: string): Promise<EmailDetail> => {
  assertServer()

  if (!id.trim()) {
    throw new Error('getEmail takes the id of an email this site sent, as returned by sendEmail.')
  }

  return request<EmailDetail>('/email', { id: id.trim() })
}

export const listEmails = async (options: ListEmailsOptions = {}): Promise<ListEmailsResult> => {
  assertServer()

  return request<ListEmailsResult>('/emails', {
    limit: options.limit,
    cursor: options.cursor,
    status: options.status,
    recipient: options.recipient,
    engagement: options.engagement,
  })
}

export const getEmailQuota = async (): Promise<EmailQuotaResult> => {
  assertServer()

  return request<EmailQuotaResult>('/quota', {})
}
