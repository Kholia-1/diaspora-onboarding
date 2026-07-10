import { api } from './client'
import type { AuditLogsResponse } from '../types'

export interface AuditFilters {
  actor?: string
  action?: string
  limit?: number
}

export function fetchAuditLogs(filters: AuditFilters = {}): Promise<AuditLogsResponse> {
  const params = new URLSearchParams()
  if (filters.actor) params.set('actor', filters.actor)
  if (filters.action) params.set('action', filters.action)
  if (filters.limit) params.set('limit', String(filters.limit))
  const query = params.toString()
  return api.get<AuditLogsResponse>(`/api/backoffice/audit-logs${query ? `?${query}` : ''}`)
}
