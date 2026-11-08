type Query = Record<string, string | undefined>

class ApiError extends Error {}

export function urlFor(path: string, query: Query = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, value)
  }
  const search = params.toString()
  return `/api${path}${search ? `?${search}` : ''}`
}

async function errorFrom(response: Response): Promise<ApiError> {
  const body: { message?: string | string[] } | null = await response
    .json()
    .catch(() => null)
  const message = Array.isArray(body?.message)
    ? body.message.join('. ')
    : body?.message
  return new ApiError(message ?? `Request failed with status ${response.status}.`)
}

async function send(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init)
  if (!response.ok) throw await errorFrom(response)
  return response
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await send(url, { signal })
  return (await response.json()) as T
}

export async function postJson(url: string, body: unknown): Promise<void> {
  await send(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteResource(url: string): Promise<void> {
  await send(url, { method: 'DELETE' })
}

export function messageOf(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Could not reach the server. Please try again.'
}
