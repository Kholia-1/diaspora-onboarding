import { api } from './client'
import type { LoginResponse, MeResponse } from '../types'

export function login(username: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>(
    '/api/backoffice/auth/login',
    { username, password },
    { skipAuthRedirect: true },
  )
}

export function logout(): Promise<void> {
  return api.post<void>('/api/backoffice/auth/logout', undefined, { skipAuthRedirect: true })
}

export function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/api/backoffice/auth/me', { skipAuthRedirect: true })
}
