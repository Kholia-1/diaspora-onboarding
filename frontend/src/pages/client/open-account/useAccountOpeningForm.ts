import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { OcrExtractedFields, Package } from '../../../types'

// ---------------------------------------------------------------------------
// État du parcours d'ouverture de compte : champs du formulaire (persistés en
// localStorage), fichiers des pièces (en mémoire), OTP et navigation d'étapes.
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'diaspora_open_account_draft_v1'
const SESSION_KEY = 'diaspora_open_account_session_id'

export interface OpenAccountForm {
  // Étape 1 — identité & contact
  identity_type: string
  sex: string
  marital_status: string
  last_name: string
  first_name: string
  birth_name: string
  birth_date: string
  birth_place: string
  nationality: string
  residence: string
  residency_status: string
  email: string
  phone: string
  address_location: string
  identity_document_number: string
  // Étape 3 — activité & compte
  account_type: string
  activity_sector_code: string
  activity_sector: string
  activity_subsector_code: string
  activity_subsector: string
  income_range: string
  preferred_branch: string
  rib: string
  // Étape 5 — package
  selected_package_code: string
}

const EMPTY_FORM: OpenAccountForm = {
  identity_type: '',
  sex: '',
  marital_status: '',
  last_name: '',
  first_name: '',
  birth_name: '',
  birth_date: '',
  birth_place: '',
  nationality: '',
  residence: '',
  residency_status: 'RESIDENT',
  email: '',
  phone: '',
  address_location: '',
  identity_document_number: '',
  account_type: '',
  activity_sector_code: '',
  activity_sector: '',
  activity_subsector_code: '',
  activity_subsector: '',
  income_range: '',
  preferred_branch: '',
  rib: '',
  selected_package_code: '',
}

export type DocOcrStatus = 'idle' | 'running' | 'done' | 'partial' | 'error'

export interface CapturedDoc {
  file: File
  previewUrl: string
  isImage: boolean
  ocrStatus: DocOcrStatus
}

export interface OtpState {
  sent: boolean
  verified: boolean
  demoOtp: string | null
  sentPhone: string | null
}

function loadDraft(): OpenAccountForm {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return { ...EMPTY_FORM }
    const parsed = JSON.parse(raw) as Partial<OpenAccountForm>
    return { ...EMPTY_FORM, ...parsed }
  } catch {
    return { ...EMPTY_FORM }
  }
}

function ensureSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, generated)
    return generated
  } catch {
    return `sess-${Date.now()}`
  }
}

export function useAccountOpeningForm() {
  const [form, setForm] = useState<OpenAccountForm>(loadDraft)
  const [step, setStep] = useState(0)
  const [docs, setDocs] = useState<Record<string, CapturedDoc>>({})
  const [otp, setOtp] = useState<OtpState>({
    sent: false,
    verified: false,
    demoOtp: null,
    sentPhone: null,
  })
  const sessionId = useMemo(ensureSessionId, [])
  const docsRef = useRef(docs)
  docsRef.current = docs

  // Persistance légère des champs (pas les fichiers).
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    } catch {
      /* stockage indisponible : le brouillon reste en mémoire */
    }
  }, [form])

  // Révocation des URLs d'aperçu au démontage.
  useEffect(() => {
    return () => {
      for (const doc of Object.values(docsRef.current)) {
        URL.revokeObjectURL(doc.previewUrl)
      }
    }
  }, [])

  const setField = useCallback((key: keyof OpenAccountForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const setFields = useCallback((values: Partial<OpenAccountForm>) => {
    setForm((prev) => ({ ...prev, ...values }))
  }, [])

  /** Pré-remplit les champs vides à partir des champs OCR d'une pièce d'identité. */
  const applyOcrFields = useCallback((fields: OcrExtractedFields): boolean => {
    let applied = false
    setForm((prev) => {
      const next = { ...prev }
      const fill = (key: keyof OpenAccountForm, value?: unknown) => {
        if (typeof value === 'string' && value.trim() && !next[key]?.trim()) {
          next[key] = value.trim()
          applied = true
        }
      }
      fill('last_name', fields.last_name)
      fill('first_name', fields.first_name)
      fill('birth_date', normalizeDate(fields.birth_date))
      fill('birth_place', fields.place_of_birth ?? fields.birth_place)
      fill('nationality', fields.nationality)
      fill('sex', mapSex(fields.sex))
      fill('identity_document_number', fields.identity_document_number ?? fields.cni_number)
      return next
    })
    return applied
  }, [])

  const setDoc = useCallback((key: string, doc: CapturedDoc) => {
    setDocs((prev) => {
      const previous = prev[key]
      if (previous) URL.revokeObjectURL(previous.previewUrl)
      return { ...prev, [key]: doc }
    })
  }, [])

  const updateDocStatus = useCallback((key: string, ocrStatus: DocOcrStatus) => {
    setDocs((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], ocrStatus } } : prev))
  }, [])

  const setSelectedPackage = useCallback((pkg: Package) => {
    setForm((prev) => ({ ...prev, selected_package_code: pkg.code }))
  }, [])

  const resetDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  return {
    form,
    setField,
    setFields,
    applyOcrFields,
    step,
    setStep,
    docs,
    setDoc,
    updateDocStatus,
    otp,
    setOtp,
    sessionId,
    setSelectedPackage,
    resetDraft,
  }
}

// --- Helpers ---------------------------------------------------------------

/** Convertit une date OCR (JJ/MM/AAAA ou variantes) en AAAA-MM-JJ pour <input type=date>. */
function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const match = trimmed.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (match) {
    const [, d, m, y] = match
    const year = y.length === 2 ? `19${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return undefined
}

function mapSex(value?: string): string | undefined {
  if (!value) return undefined
  const v = value.trim().toUpperCase()
  if (v.startsWith('M')) return 'Masculin'
  if (v.startsWith('F')) return 'Féminin'
  return undefined
}
