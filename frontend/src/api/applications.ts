import { api } from './client'
import type {
  ApplicationDetailResponse,
  ApplicationSummary,
  DashboardSummary,
  DecisionPayload,
  DecisionResponse,
  OpenAccountPayload,
  OpenAccountResponse,
  OpenedAccount,
  ScreeningResponse,
} from '../types'

export function fetchApplications(): Promise<ApplicationSummary[]> {
  return api.get<ApplicationSummary[]>('/api/backoffice/applications')
}

export function fetchApplication(idOrReference: string): Promise<ApplicationDetailResponse> {
  return api.get<ApplicationDetailResponse>(
    `/api/backoffice/applications/${encodeURIComponent(idOrReference)}`,
  )
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>('/api/backoffice/dashboard/summary')
}

/** Décision back-office (approbation, rejet, complément) sur un dossier. */
export function submitDecision(
  applicationId: number,
  payload: DecisionPayload,
): Promise<DecisionResponse> {
  return api.post<DecisionResponse>(
    `/api/backoffice/applications/${applicationId}/decision`,
    payload,
  )
}

/** Screening BlackModule (endpoint public côté API applications). */
export function screenBlackmodule(applicationId: number): Promise<ScreeningResponse> {
  return api.post<ScreeningResponse>(`/api/applications/${applicationId}/screen-blackmodule`)
}

/** Ouverture de compte (numéro de compte + RIB saisis par le back-office). */
export function openAccount(
  reference: string,
  payload: OpenAccountPayload,
): Promise<OpenAccountResponse> {
  return api.post<OpenAccountResponse>(
    `/api/backoffice/applications/${encodeURIComponent(reference)}/open-account`,
    payload,
  )
}

/** Informations du compte ouvert pour un dossier (404 si pas encore ouvert). */
export function fetchOpenedAccount(reference: string): Promise<OpenedAccount> {
  return api.get<OpenedAccount>(
    `/api/backoffice/applications/${encodeURIComponent(reference)}/opened-account`,
  )
}
