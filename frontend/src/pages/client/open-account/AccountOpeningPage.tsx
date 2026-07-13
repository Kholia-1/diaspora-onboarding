import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createApplication,
  fetchActivePackages,
  uploadApplicationDocument,
} from '../../../api/onboarding'
import { ApiError } from '../../../api/client'
import { Button } from '../../../components/ui/Button'
import type { ApplicationCreatePayload } from '../../../types'
import { requiredDocumentsFor } from './constants'
import { Stepper } from './Stepper'
import { Step1PersonalInfo } from './Step1PersonalInfo'
import { Step2WhatsappOtp } from './Step2WhatsappOtp'
import { Step3Activity } from './Step3Activity'
import { Step4Documents } from './Step4Documents'
import { Step5PackageReview } from './Step5PackageReview'
import { SuccessScreen } from './SuccessScreen'
import { useOaText } from './oaText'
import { useAccountOpeningForm } from './useAccountOpeningForm'

interface PendingDoc {
  key: string
  label: string
  uploadType: string
  file: File
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AccountOpeningPage() {
  const { t } = useOaText()
  const ctl = useAccountOpeningForm()
  const { form, step, setStep, docs, otp, sessionId, resetDraft } = ctl

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const [failedDocs, setFailedDocs] = useState<PendingDoc[]>([])
  const [retrying, setRetrying] = useState(false)

  // Packages en cache pour compléter le payload (nom, devise, frais).
  const { data: packages = [] } = useQuery({
    queryKey: ['ref', 'packages', 'active'],
    queryFn: fetchActivePackages,
    staleTime: 5 * 60_000,
  })

  const stepLabels = [
    t('step.personal'),
    t('step.otp'),
    t('step.activity'),
    t('step.documents'),
    t('step.package'),
  ]

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!form.last_name.trim() || !form.first_name.trim() || !form.email.trim()) {
        return t('err.required_fields')
      }
      if (!EMAIL_RE.test(form.email.trim())) return t('err.email_invalid')
    }
    if (index === 2 && !form.account_type) return t('err.account_type_required')
    if (index === 3) {
      const identityDoc = requiredDocumentsFor(form.account_type).find((d) => d.isIdentity)
      if (identityDoc && !docs[identityDoc.key]) return t('err.identity_required')
    }
    return null
  }

  const goNext = () => {
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setStep(Math.min(step + 1, stepLabels.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goPrevious = () => {
    setError(null)
    setStep(Math.max(step - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const buildPayload = (): ApplicationCreatePayload => {
    const pkg = packages.find((p) => p.code === form.selected_package_code)
    return {
      last_name: form.last_name.trim(),
      first_name: form.first_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      birth_date: form.birth_date || null,
      birth_place: form.birth_place || null,
      birth_name: form.birth_name || null,
      residency_status: form.residency_status || 'RESIDENT',
      address_location: form.address_location || null,
      nationality: form.nationality || null,
      residence: form.residence || null,
      sex: form.sex || null,
      marital_status: form.marital_status || null,
      identity_document_number: form.identity_document_number || null,
      rib: form.rib || null,
      income_range: form.income_range || null,
      activity_sector: form.activity_sector || null,
      activity_sector_code: form.activity_sector_code || null,
      activity_subsector: form.activity_subsector || null,
      activity_subsector_code: form.activity_subsector_code || null,
      account_type: form.account_type || null,
      preferred_branch: form.preferred_branch || null,
      selected_package_code: pkg?.code ?? null,
      selected_package_name: pkg?.name ?? null,
      selected_package_currency: pkg?.currency ?? null,
      selected_package_opening_fee: pkg?.opening_fee ?? 0,
      selected_package_subscription_fee: pkg?.subscription_fee ?? 0,
      selected_package_monthly_fee: pkg?.monthly_fee ?? 0,
      selected_package_payment_required: pkg?.payment_required ?? false,
      pre_onboarding_session_id: sessionId,
      whatsapp_phone_full: otp.verified ? (otp.sentPhone ?? form.phone.trim()) : null,
      whatsapp_otp_verified: otp.verified,
      is_pep: false,
    }
  }

  const collectDocs = (): PendingDoc[] => {
    const specs = requiredDocumentsFor(form.account_type)
    const result: PendingDoc[] = []
    for (const spec of specs) {
      const captured = docs[spec.key]
      if (captured) {
        result.push({
          key: spec.key,
          label: spec.label.fr,
          uploadType: spec.uploadType,
          file: captured.file,
        })
      }
    }
    return result
  }

  const uploadDocs = async (applicationId: number, pending: PendingDoc[]): Promise<PendingDoc[]> => {
    const failed: PendingDoc[] = []
    for (const doc of pending) {
      try {
        await uploadApplicationDocument(applicationId, doc.uploadType, doc.file)
      } catch {
        failed.push(doc)
      }
    }
    return failed
  }

  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const created = await createApplication(buildPayload())
      setCreatedId(created.id)
      setReference(created.reference)
      const failed = await uploadDocs(created.id, collectDocs())
      setFailedDocs(failed)
      resetDraft()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('err.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetryDocs = async () => {
    if (createdId === null) return
    setRetrying(true)
    const stillFailed = await uploadDocs(createdId, failedDocs)
    setFailedDocs(stillFailed)
    setRetrying(false)
  }

  // Écran de succès
  if (reference) {
    return (
      <SuccessScreen
        reference={reference}
        failedDocs={failedDocs.map((d) => d.label)}
        onRetryDocs={handleRetryDocs}
        retrying={retrying}
      />
    )
  }

  const isLastStep = step === stepLabels.length - 1

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">{t('page.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('page.subtitle')}</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card">
        <Stepper steps={stepLabels} current={step} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-card">
        {step === 0 && <Step1PersonalInfo ctl={ctl} />}
        {step === 1 && <Step2WhatsappOtp ctl={ctl} />}
        {step === 2 && <Step3Activity ctl={ctl} />}
        {step === 3 && <Step4Documents ctl={ctl} />}
        {step === 4 && <Step5PackageReview ctl={ctl} />}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={goPrevious} disabled={step === 0 || submitting}>
          {t('nav.previous')}
        </Button>
        {isLastStep ? (
          <Button variant="success" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('nav.submitting') : t('nav.submit')}
          </Button>
        ) : (
          <Button onClick={goNext}>{t('nav.next')}</Button>
        )}
      </div>
    </div>
  )
}
