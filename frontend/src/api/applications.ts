import { api } from './client'
import type { ApplicationDetailResponse, ApplicationSummary } from '../types'

export function fetchApplications(): Promise<ApplicationSummary[]> {
  return api.get<ApplicationSummary[]>('/api/backoffice/applications')
}

export function fetchApplication(idOrReference: string): Promise<ApplicationDetailResponse> {
  return api.get<ApplicationDetailResponse>(
    `/api/backoffice/applications/${encodeURIComponent(idOrReference)}`,
  )
}
