/**
 * API de configuration back-office : packages proposés au client et
 * intégrations API externes (WhatsApp, Mastercard, BlackModule). Endpoints
 * authentifiés par session (le wrapper gère la redirection 401).
 */
import { api } from './client'
import type {
  ApiIntegration,
  ApiIntegrationsResponse,
  BackofficePackage,
  BackofficePackagesResponse,
  IntegrationTestResult,
} from '../types'

// --- Packages --------------------------------------------------------------

export function fetchPackages(): Promise<BackofficePackagesResponse> {
  return api.get<BackofficePackagesResponse>('/api/backoffice/packages')
}

export function savePackages(
  packages: BackofficePackage[],
): Promise<BackofficePackagesResponse> {
  return api.post<BackofficePackagesResponse>('/api/backoffice/packages', { packages })
}

// --- Intégrations API ------------------------------------------------------

export function fetchApiIntegrations(): Promise<ApiIntegrationsResponse> {
  return api.get<ApiIntegrationsResponse>('/api/backoffice/api-integrations')
}

export function saveApiIntegrations(
  integrations: ApiIntegration[],
): Promise<ApiIntegrationsResponse> {
  return api.post<ApiIntegrationsResponse>('/api/backoffice/api-integrations', { integrations })
}

/** Teste la connexion d'une intégration (utilise la config enregistrée côté serveur). */
export function testApiIntegration(code: string): Promise<IntegrationTestResult> {
  return api.post<IntegrationTestResult>(
    `/api/backoffice/api-integrations/${encodeURIComponent(code)}/test`,
  )
}
