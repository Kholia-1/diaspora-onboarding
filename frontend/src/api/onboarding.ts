/**
 * API du parcours public d'ouverture de compte : référentiels, pré-onboarding
 * (OTP WhatsApp + OCR) et soumission du dossier. Tous les appels sont publics
 * (skipAuthRedirect) pour ne jamais renvoyer un client vers le login back-office.
 */
import { api, postForm } from './client'
import type {
  Agency,
  ApplicationCreatePayload,
  ApplicationCreateResponse,
  Country,
  Nationality,
  OcrResponse,
  OtpSendResponse,
  OtpVerifyResponse,
  Package,
  Sector,
  Subsector,
} from '../types'

const publicGet = { skipAuthRedirect: true } as const

// --- Référentiels ----------------------------------------------------------

export function fetchActiveSectors(): Promise<Sector[]> {
  return api.get<Sector[]>('/api/sectors/active', publicGet)
}

export function fetchSubsectorsBySector(sectorCode: string): Promise<Subsector[]> {
  return api.get<Subsector[]>(
    `/api/subsectors/by-sector/${encodeURIComponent(sectorCode)}`,
    publicGet,
  )
}

export function fetchActiveAgencies(): Promise<Agency[]> {
  return api.get<Agency[]>('/api/agencies/active', publicGet)
}

export function fetchActiveNationalities(): Promise<Nationality[]> {
  return api.get<Nationality[]>('/api/nationalities/active', publicGet)
}

export function fetchActiveCountries(): Promise<Country[]> {
  return api.get<Country[]>('/api/countries/active', publicGet)
}

/**
 * Packages actifs proposés au client. Endpoint public dédié /api/packages/active
 * (déjà filtré actifs + trié par display_order côté serveur).
 */
export async function fetchActivePackages(): Promise<Package[]> {
  return api.get<Package[]>('/api/packages/active', publicGet)
}

// --- Pré-onboarding : OTP WhatsApp -----------------------------------------

export function sendOtp(sessionId: string, phone: string): Promise<OtpSendResponse> {
  return api.post<OtpSendResponse>(
    '/api/pre-onboarding/otp/send',
    { session_id: sessionId, phone },
    publicGet,
  )
}

export function verifyOtp(
  sessionId: string,
  phone: string,
  otp: string,
): Promise<OtpVerifyResponse> {
  return api.post<OtpVerifyResponse>(
    '/api/pre-onboarding/otp/verify',
    { session_id: sessionId, phone, otp },
    publicGet,
  )
}

// --- Pré-onboarding : OCR ---------------------------------------------------

export function runOcr(
  file: File,
  documentType: string,
  accountType: string,
  sessionId?: string,
): Promise<OcrResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('document_type', documentType)
  form.append('account_type', accountType || 'INDIVIDUAL')
  if (sessionId) form.append('session_id', sessionId)
  return postForm<OcrResponse>('/api/pre-onboarding/ocr', form)
}

// --- Soumission du dossier --------------------------------------------------

export function createApplication(
  payload: ApplicationCreatePayload,
): Promise<ApplicationCreateResponse> {
  return api.post<ApplicationCreateResponse>('/api/applications', payload, publicGet)
}

/**
 * Upload d'une pièce justificative. Le backend attend document_type en
 * paramètre de requête et le fichier en multipart.
 */
export function uploadApplicationDocument(
  applicationId: number,
  documentType: string,
  file: File,
): Promise<unknown> {
  const form = new FormData()
  form.append('file', file)
  return postForm(
    `/api/applications/${applicationId}/documents?document_type=${encodeURIComponent(documentType)}`,
    form,
  )
}
