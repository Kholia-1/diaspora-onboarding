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
  document_type?: string | null
  document_label: string | null
  original_filename: string | null
  mime_type: string | null
  verification_status: string | null
  quality_score: number | null
  content_url: string | null
  can_analyze?: boolean
  analysis_url?: string | null
  is_video: boolean
  is_media_only?: boolean
}

// ---------------------------------------------------------------------------
// Analyse documentaire (OCR + rapprochement) d'un document
// GET /api/applications/documents/{id}/analysis (quand can_analyze = true)
// ---------------------------------------------------------------------------

/** Un contrôle du rapprochement OCR ↔ dossier. La forme varie selon le champ :
 *  identité {field, expected, matched}, RIB {field:"rib", expected, detected, score, status},
 *  revenu {field:"income_proof", expected, detected_keywords, status, score}. */
export interface MatchingCheck {
  field: string
  expected?: unknown
  matched?: boolean
  detected?: string
  detected_candidates?: string[]
  detected_keywords?: string[]
  status?: string
  score?: number
  [key: string]: unknown
}

export interface DocumentMatching {
  match_score?: number
  match_status?: string
  checks?: MatchingCheck[]
  [key: string]: unknown
}

export interface DocumentQualityInfo {
  supported?: boolean
  quality_score?: number
  quality_status?: string
  findings?: string[]
  brightness?: number | null
  laplacian_variance?: number | null
  glare_fraction?: number
  /** Variantes possibles selon le backend. */
  score?: number
  verdict?: string
  issues?: string[]
  [key: string]: unknown
}

export interface DocumentOcrInfo {
  engine?: string
  ocr_status?: string
  message?: string
  text?: string
  text_preview?: string
  text_length?: number
  confidence?: number
  [key: string]: unknown
}

export interface DocumentAnalysisBody {
  document_type?: string
  text_preview?: string
  extracted_fields?: Record<string, unknown>
  quality_score?: number
  verification_status?: string
  quality?: DocumentQualityInfo
  ocr?: DocumentOcrInfo
  matching?: DocumentMatching
  document_type_validation?: Record<string, unknown>
  [key: string]: unknown
}

export interface DocumentAnalysis {
  document_id: number
  document_type: string | null
  verification_status: string | null
  quality_score: number | null
  analysis: DocumentAnalysisBody
}

export interface ApplicationDetailResponse {
  application: ApplicationDetail
  documents: ApplicationDocument[]
}

// ---------------------------------------------------------------------------
// Référentiels
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Actions back-office sur un dossier
// ---------------------------------------------------------------------------

export type BackofficeDecision = 'APPROVED' | 'REJECTED' | 'NEED_MORE_DOCUMENTS'

export interface DecisionPayload {
  decision: BackofficeDecision
  comment?: string
  client_message?: string
}

export interface DecisionResponse {
  message?: string
  reference?: string
  decision?: string
  status?: string
  [key: string]: unknown
}

export interface ScreeningResponse {
  message?: string
  application_reference?: string
  blackmodule_status?: string | null
  blackmodule_score?: number | null
  blackmodule_alert?: string | boolean | null
  risk_level?: string | null
  application_status?: string | null
  [key: string]: unknown
}

export interface OpenedAccount {
  application_reference: string
  client_email: string | null
  account_number: string | null
  rib: string | null
  status: string | null
  created_at: string | null
}

export interface OpenAccountPayload {
  account_number: string
  rib: string
  comment?: string
}

export interface OpenAccountResponse {
  message?: string
  application_status?: string
  account?: OpenedAccount
  [key: string]: unknown
}

export interface DashboardSummary {
  total_demandes: number
  demandes_soumises: number
  alertes_blackmodule: number
  revue_conformite: number
  dossiers_approuves: number
  dossiers_rejetes: number
  comptes_ouverts: number
}

// ---------------------------------------------------------------------------
// Suivi client public
// ---------------------------------------------------------------------------

export interface ClientApplicationStatus {
  reference: string
  full_name: string | null
  email: string | null
  phone: string | null
  preferred_branch: string | null
  nationality: string | null
  residency_status: string | null
  status: ApplicationStatus | string
  risk_level: string | null
  kyc_score: number | null
  document_score: number | null
  blackmodule_status: string | null
  created_at: string | null
  review_decision: string | null
  review_comment: string | null
  client_message: string | null
  final_rib: string | null
  account_number: string | null
  [key: string]: unknown
}

export interface StatusByContactResponse {
  identifier: string
  count: number
  applications: ClientApplicationStatus[]
}

export interface OpenedAccountPublic {
  application_reference: string
  status: string | null
  client_email: string | null
  account_opened: boolean
  account_number: string | null
  rib: string | null
  message_to_client: string | null
  payment_status: string | null
  opened_at: string | null
}

export interface Agency {
  id: number
  code: string
  name: string
  city: string | null
  country: string | null
  country_id: number | null
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
// Ouverture de compte client (parcours public multi-étapes)
// ---------------------------------------------------------------------------

export interface Sector {
  code: string
  name: string
}

export interface Subsector {
  code: string
  label: string
  sector_code: string
  sector: string
}

export interface Package {
  code: string
  name: string
  description: string | null
  services: string[]
  currency: string | null
  opening_fee: number
  subscription_fee: number
  monthly_fee: number
  payment_required: boolean
  active?: boolean
  display_order?: number | null
  [key: string]: unknown
}

export interface PackagesResponse {
  packages: Package[]
}

export interface OtpSendResponse {
  ok: boolean
  message?: string
  phone?: string
  demo_mode?: boolean
  demo_otp?: string
  fallback_otp?: string
  fallback_display?: boolean
  expires_at?: string
  [key: string]: unknown
}

export interface OtpVerifyResponse {
  ok: boolean
  verified: boolean
  message?: string
  session_id?: string
  phone?: string
  whatsapp_phone_full?: string
  verified_at?: string
  whatsapp_otp_verified?: boolean
  whatsapp_otp_verified_at?: string
  [key: string]: unknown
}

/** Champs pré-remplis renvoyés par l'OCR (clés variables selon le document). */
export interface OcrExtractedFields {
  last_name?: string
  first_name?: string
  birth_date?: string
  place_of_birth?: string
  birth_place?: string
  profession?: string
  cni_number?: string
  identity_document_number?: string
  passport_number?: string
  nationality?: string
  sex?: string
  possible_dates?: string[]
  [key: string]: unknown
}

export interface OcrResponse {
  status: string
  account_type?: string
  document_type?: string
  filename?: string
  mime_type?: string
  ocr_status?: string
  document_type_validation_status?: string
  extracted_fields: OcrExtractedFields
  [key: string]: unknown
}

/** Payload de création de dossier (POST /api/applications), snake_case. */
export interface ApplicationCreatePayload {
  last_name: string
  first_name: string
  email: string
  phone?: string | null
  birth_date?: string | null
  birth_place?: string | null
  birth_department?: string | null
  birth_name?: string | null
  residency_status?: string
  address_location?: string | null
  postal_box?: string | null
  nationality?: string | null
  residence?: string | null
  sex?: string | null
  marital_status?: string | null
  matrimonial_regime?: string | null
  identity_document_number?: string | null
  identity_document_issue_date?: string | null
  identity_document_issue_place?: string | null
  rib?: string | null
  income_range?: string | null
  activity_sector?: string | null
  activity_sector_code?: string | null
  activity_subsector?: string | null
  activity_subsector_code?: string | null
  account_type?: string | null
  preferred_branch?: string | null
  account_purpose?: string | null
  selected_package_code?: string | null
  selected_package_name?: string | null
  selected_package_currency?: string | null
  selected_package_opening_fee?: number | null
  selected_package_subscription_fee?: number | null
  selected_package_monthly_fee?: number | null
  selected_package_payment_required?: boolean | null
  pre_onboarding_session_id?: string | null
  whatsapp_phone_full?: string | null
  whatsapp_otp_verified?: boolean
  whatsapp_otp_verified_at?: string | null
  is_pep?: boolean
  pep_details?: string | null
  [key: string]: unknown
}

export interface ApplicationCreateResponse {
  id: number
  reference: string
  status: string
  kyc_score?: number | null
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Configuration back-office : packages & intégrations API
// ---------------------------------------------------------------------------

/** Package éditable dans la configuration back-office (parité legacy). */
export interface BackofficePackage {
  code: string
  name: string
  description: string
  services: string[]
  currency: string
  opening_fee: number
  subscription_fee: number
  monthly_fee: number
  payment_required: boolean
  active: boolean
  display_order: number
  customer_type: string
  mastercard_item_code: string
  whatsapp_template: string
  [key: string]: unknown
}

export interface BackofficePackagesResponse {
  packages: BackofficePackage[]
  message?: string
}

/** Intégration API éditable. Les secrets (api_key, client_secret) arrivent masqués. */
export interface ApiIntegration {
  code: string
  name: string
  description: string
  enabled: boolean
  environment: string
  provider: string
  base_url: string
  auth_type: string
  api_key: string
  client_id: string
  client_secret: string
  phone_number_id?: string
  merchant_id?: string
  webhook_url: string
  callback_url: string
  notes: string
  [key: string]: unknown
}

export interface ApiIntegrationsResponse {
  integrations: ApiIntegration[]
  message?: string
}

export interface IntegrationConnectivity {
  attempted: boolean
  success: boolean
  http_status?: number
  message: string
}

export interface IntegrationTestResult {
  code: string
  name?: string
  /** DISABLED | CONFIG_INCOMPLETE | CONNECTION_OK | CONNECTION_FAILED */
  status: string
  success: boolean
  message: string
  missing_fields?: string[]
  environment?: string
  provider?: string
  connectivity?: IntegrationConnectivity
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
