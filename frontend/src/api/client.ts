/**
 * Wrapper fetch maison : cookies de session, erreurs {detail},
 * redirection vers /login sur 401 (hors endpoints d'authentification).
 */

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Ne pas rediriger vers /login sur 401 (ex. GET /me, POST /login). */
  skipAuthRedirect?: boolean
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: unknown; message?: unknown }
    if (typeof data.detail === 'string' && data.detail) return data.detail
    // detail peut être un objet structuré (ex. garde de paiement avant ouverture
    // de compte : {status: "PAYMENT_REQUIRED_NOT_CONFIRMED", message: "..."}).
    if (data.detail && typeof data.detail === 'object') {
      const detail = data.detail as { message?: unknown; status?: unknown }
      if (typeof detail.message === 'string' && detail.message) return detail.message
      if (typeof detail.status === 'string' && detail.status) return detail.status
    }
    if (typeof data.message === 'string' && data.message) return data.message
  } catch {
    // corps non JSON : on retombe sur un message générique
  }
  return `Erreur ${response.status}`
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuthRedirect = false } = options

  let response: Response
  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez votre connexion.')
  }

  if (response.status === 401 && !skipAuthRedirect) {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    throw new ApiError(401, 'Session expirée, veuillez vous reconnecter.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/**
 * POST multipart/form-data : ne pose pas de Content-Type (le navigateur ajoute
 * la boundary), conserve les cookies de session et la gestion d'erreur {detail}.
 * Utilisé pour l'OCR pré-onboarding et l'upload des pièces justificatives.
 */
export async function postForm<T>(
  path: string,
  formData: FormData,
  options: { skipAuthRedirect?: boolean } = {},
): Promise<T> {
  const { skipAuthRedirect = true } = options

  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez votre connexion.')
  }

  if (response.status === 401 && !skipAuthRedirect) {
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    throw new ApiError(401, 'Session expirée, veuillez vous reconnecter.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response))
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm,
}
