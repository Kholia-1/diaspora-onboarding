/**
 * API publique de suivi client (pages hors back-office).
 * Les appels passent skipAuthRedirect pour ne jamais rediriger un client
 * vers l'écran de connexion du back-office.
 */
import { api } from './client'
import type { OpenedAccountPublic, StatusByContactResponse } from '../types'

export function fetchStatusByContact(identifier: string): Promise<StatusByContactResponse> {
  return api.get<StatusByContactResponse>(
    `/api/applications/status-by-contact?identifier=${encodeURIComponent(identifier)}`,
    { skipAuthRedirect: true },
  )
}

export function fetchOpenedAccountPublic(
  reference: string,
  email: string,
): Promise<OpenedAccountPublic> {
  return api.get<OpenedAccountPublic>(
    `/api/applications/${encodeURIComponent(reference)}/opened-account-public?email=${encodeURIComponent(email)}`,
    { skipAuthRedirect: true },
  )
}
