/** Types des payloads de l'API back-office (JSON snake_case). */

// ---------------------------------------------------------------------------
// Auth & utilisateurs
// ---------------------------------------------------------------------------

export interface SessionUser {
  username: string
  full_name: string
  role: string
}

export interface LoginResponse {
  ok: boolean
  user: SessionUser
}

export interface MeResponse {
  ok: boolean
  user: SessionUser
}

export interface BackofficeUser {
  id: number
  username: string
  full_name: string
  role: string
  role_label: string
  active: boolean
  created_at: string | null
  last_login_at: string | null
}

export interface UsersResponse {
  count: number
  users: BackofficeUser[]
}

export interface RoleOption {
  code: string
  label: string
}

export interface RolesResponse {
  roles: RoleOption[]
}

export interface CreateUserPayload {
  username: string
  full_name: string
  role: string
  password: string
}

export interface UpdateUserPayload {
  role?: string
  active?: boolean
  password?: string
  full_name?: string
}

// ---------------------------------------------------------------------------
// Dossiers (applications)
// ---------------------------------------------------------------------------

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'AUTO_KYC_OK'
  | 'AUTO_KYC_REVIEW'
  | 'BLACKMODULE_ALERT'
  | 'COMPLIANCE_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEED_MORE_DOCUMENTS'
  | 'ACCOUNT_OPENED'

export interface ApplicationSummary {
  id: number
  reference: string
  last_name: string | null
  first_name: string | null
  email: string | null
  phone: string | null
  status: ApplicationStatus | string
  risk_level: string | null
  kyc_score: number | null
  document_score: number | null
  blackmodule_status: string | null
  nationality: string | null
  account_type: string | null
  preferred_branch: string | null
  created_at: string | null
  [key: string]: unknown
}

/** Détail d'un dossier : ~60 champs snake_case, tous optionnels côté front. */
export interface ApplicationDetail extends ApplicationSummary {
  client_message?: string | null
  account_number?: string | null
  final_rib?: string | null
  selected_package_code?: string | null
  selected_package_label?: string | null
  selected_package_price?: number | string | null
  package_payment_status?: string | null
  package_payment_reference?: string | null
  package_payment_amount?: number | string | null
  package_payment_at?: string | null
}

export interface ApplicationDocument {
  id: number
  document_label: string | null
  original_filename: string | null
  mime_type: string | null
  verification_status: string | null
  quality_score: number | null
  content_url: string | null
  is_video: boolean
}

export interface ApplicationDetailResponse {
  application: ApplicationDetail
  documents: ApplicationDocument[]
}

// ---------------------------------------------------------------------------
// Référentiels
// ---------------------------------------------------------------------------

export interface Agency {
  id: number
  code: string
  name: string
  city: string | null
  country: string | null
  active: boolean
}

export interface Nationality {
  id: number
  code: string
  label: string
  active: boolean
}

export interface Country {
  id: number
  iso_code: string
  flag: string | null
  name_fr: string
  calling_code: string | null
  active: boolean
  display_order: number | null
}

// ---------------------------------------------------------------------------
// Journal d'audit
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: number
  actor: string | null
  action: string | null
  target: string | null
  details: string | null
  created_at: string | null
  [key: string]: unknown
}

export interface AuditLogsResponse {
  ok: boolean
  count: number
  logs: AuditLog[]
}
