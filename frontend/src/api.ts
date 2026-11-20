let csrf: { token: string; headerName: string } | null = null

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers(options.headers)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!csrf) {
      const result = await fetch('/api/auth/csrf', {
        credentials: 'same-origin',
      })
      if (!result.ok)
        throw new ApiError(
          'Die Verbindung zum Server ist fehlgeschlagen.',
          result.status,
        )
      csrf = await result.json()
    }
    headers.set(csrf!.headerName, csrf!.token)
  }
  if (options.body && !(options.body instanceof URLSearchParams))
    headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error
    throw new ApiError(
      'Der Server ist nicht erreichbar. Bitte Verbindung prüfen.',
      0,
    )
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    if (
      response.status === 401 &&
      path !== '/auth/me' &&
      path !== '/auth/login'
    ) {
      window.dispatchEvent(new Event('session-expired'))
    }
    throw new ApiError(
      data?.message ?? 'Die Anfrage konnte nicht verarbeitet werden.',
      response.status,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function clearCsrf() {
  csrf = null
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten.'
}
