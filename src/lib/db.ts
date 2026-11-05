// Server-only helper for the project database (SQLite over HTTP).
// Import it only from API routes, getServerSideProps or other server code.

interface DatabasePayload<T> {
  success?: boolean
  rows?: T[]
  result?: Array<{ results?: T[] }>
  errors?: Array<{ message?: string }>
}

export const query = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> => {
  if (typeof window !== 'undefined') {
    throw new Error('The database helper can only run on the server.')
  }

  const url = process.env.DATABASE_URL
  const token = process.env.DATABASE_TOKEN

  if (!url || !token) {
    throw new Error('The database is not configured.')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sql, params }),
    signal: AbortSignal.timeout(15000),
  })

  const payload = (await response.json().catch(() => null)) as DatabasePayload<T> | null

  if (!response.ok || !payload || payload.success === false) {
    const reason = payload?.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join('; ')

    throw new Error(reason || `Database request failed with status ${response.status}.`)
  }

  return payload.rows ?? payload.result?.[0]?.results ?? []
}
