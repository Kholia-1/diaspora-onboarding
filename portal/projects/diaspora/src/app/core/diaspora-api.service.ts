import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  Agency,
  ApplicationCreate,
  ApplicationResponse,
  Country,
  Nationality,
  Subsector,
} from './application.model';

/**
 * Champs KYC extraits par l'OCR (`extracted_fields`). Partiel selon la qualité
 * de l'image. Les dates sont au format JJ/MM/AAAA (à convertir en ISO côté form).
 */
export interface OcrExtractedFields {
  last_name?: string;
  surname?: string;
  first_name?: string;
  given_names?: string;
  full_name?: string;
  birth_date?: string; // JJ/MM/AAAA
  place_of_birth?: string;
  profession?: string;
  cni_number?: string;
  passport_number?: string;
  identity_document_number?: string;
  identity_issue_date?: string;
  identity_expiry_date?: string;
  nationality?: string;
  sex?: string;
  possible_dates?: string[];
  [key: string]: unknown;
}

export interface OcrQuality {
  score?: number;
  verdict?: string;
  issues?: string[];
}

/** Réponse de POST /api/pre-onboarding/ocr. */
export interface OcrResult {
  status?: string;
  account_type?: string;
  document_type?: string;
  filename?: string;
  mime_type?: string;
  text_length?: number;
  text_preview?: string;
  extracted_fields?: OcrExtractedFields;
  quality?: OcrQuality;
  document_type_validation?: { status?: string; message?: string; [k: string]: unknown };
  document_type_validation_status?: string;
  engine?: string;
  ocr_status?: string;
  ocr_available?: boolean;
  ocr_error?: string | null;
  [key: string]: unknown;
}

/**
 * Wrapper typé de l'API FastAPI diaspora-onboarding (base /api).
 * Endpoints dérivés de app/routers/*.py (côté client public).
 */
@Injectable({ providedIn: 'root' })
export class DiasporaApi {
  private http = inject(HttpClient);
  private base = '/api';

  // ---- Demandes d'ouverture de compte ----
  createApplication(payload: ApplicationCreate): Observable<ApplicationResponse> {
    return this.http.post<ApplicationResponse>(`${this.base}/applications`, payload);
  }
  getApplication(id: number): Observable<ApplicationResponse> {
    return this.http.get<ApplicationResponse>(`${this.base}/applications/${id}`);
  }
  statusByEmail(email: string): Observable<unknown> {
    return this.http.get(`${this.base}/applications/status-by-email`, {
      params: new HttpParams().set('email', email),
    });
  }
  statusByContact(identifier: string): Observable<unknown> {
    return this.http.get(`${this.base}/applications/status-by-contact`, {
      params: new HttpParams().set('identifier', identifier),
    });
  }
  statusByReference(reference: string, email?: string): Observable<unknown> {
    let params = new HttpParams();
    if (email) params = params.set('email', email);
    return this.http.get(`${this.base}/applications/status/${reference}`, { params });
  }
  uploadDocument(applicationId: number, file: File, documentType: string): Observable<unknown> {
    const form = new FormData();
    form.append('file', file);
    form.append('document_type', documentType);
    return this.http.post(`${this.base}/applications/${applicationId}/documents`, form);
  }

  // ---- Pré-onboarding (OCR prefill) ----
  /**
   * Lecture OCR d'une pièce (CNI, passeport…) pour préremplir le formulaire.
   * Endpoint réel FastAPI : POST /api/pre-onboarding/ocr (multipart).
   * `account_type` est requis côté serveur mais accepte la chaîne vide.
   */
  ocr(
    file: File,
    documentType: string,
    accountType = '',
    sessionId?: string,
  ): Observable<OcrResult> {
    const form = new FormData();
    form.append('account_type', accountType);
    form.append('document_type', documentType);
    form.append('file', file);
    if (sessionId) form.append('session_id', sessionId);
    return this.http.post<OcrResult>(`${this.base}/pre-onboarding/ocr`, form);
  }

  // ---- Référentiels ----
  // L'API (Spring et FastAPI) renvoie iso_code/name_fr/calling_code (pays) et
  // code/label (nationalités). On mappe vers le contrat { code, name, dial_code }
  // attendu par l'UI. Fallbacks défensifs : marche aussi si l'API renvoyait déjà
  // code/name.
  countries(): Observable<Country[]> {
    return this.http.get<Array<Record<string, unknown>>>(`${this.base}/countries/active`).pipe(
      map((rows) =>
        (rows ?? []).map((c) => ({
          code: String(c['iso_code'] ?? c['code'] ?? ''),
          name: String(c['name_fr'] ?? c['name'] ?? ''),
          dial_code: (c['calling_code'] ?? c['dial_code']) as string | undefined,
        })),
      ),
    );
  }
  nationalities(): Observable<Nationality[]> {
    return this.http.get<Array<Record<string, unknown>>>(`${this.base}/nationalities/active`).pipe(
      map((rows) =>
        (rows ?? []).map((n) => ({
          code: String(n['code'] ?? ''),
          name: String(n['label'] ?? n['name'] ?? ''),
        })),
      ),
    );
  }
  agencies(): Observable<Agency[]> {
    return this.http.get<Agency[]>(`${this.base}/agencies/active`);
  }
  subsectorsBySector(sectorCode: string): Observable<Subsector[]> {
    return this.http.get<Subsector[]>(`${this.base}/subsectors/by-sector/${sectorCode}`);
  }
  subsectorsGrouped(): Observable<unknown> {
    return this.http.get(`${this.base}/subsectors/grouped`);
  }

  // ---- Paiements (Mastercard gateway) ----
  initiatePackagePayment(applicationReference: string): Observable<unknown> {
    return this.http.post(`${this.base}/payments/package/initiate/${applicationReference}`, {});
  }
  getPayment(paymentReference: string): Observable<unknown> {
    return this.http.get(`${this.base}/payments/${paymentReference}`);
  }
}
