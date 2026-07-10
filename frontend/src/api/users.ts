import { api } from './client'
import type {
  BackofficeUser,
  CreateUserPayload,
  RolesResponse,
  UpdateUserPayload,
  UsersResponse,
} from '../types'

export function fetchUsers(): Promise<UsersResponse> {
  return api.get<UsersResponse>('/api/backoffice/users')
}

export function fetchRoles(): Promise<RolesResponse> {
  return api.get<RolesResponse>('/api/backoffice/users/roles')
}

export function createUser(payload: CreateUserPayload): Promise<BackofficeUser> {
  return api.post<BackofficeUser>('/api/backoffice/users', payload)
}

export function updateUser(id: number, payload: UpdateUserPayload): Promise<BackofficeUser> {
  return api.patch<BackofficeUser>(`/api/backoffice/users/${id}`, payload)
}
