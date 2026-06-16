import type { ApiError } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    })
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Network request failed')
  }

  if (!response.ok) {
    let errorBody: ApiError | null = null
    try {
      errorBody = await response.json()
    } catch {
      // ignore parse errors
    }
    const code = errorBody?.error?.code ?? 'UNKNOWN_ERROR'
    const message = errorBody?.error?.message ?? `Request failed with status ${response.status}`
    throw new ApiRequestError(response.status, code, message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const apiGet = <T>(path: string) => request<T>(path)
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined })
export const apiDelete = (path: string) => request<void>(path, { method: 'DELETE' })
