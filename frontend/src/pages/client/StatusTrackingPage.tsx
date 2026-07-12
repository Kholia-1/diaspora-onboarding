import type { FormEvent } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchOpenedAccountPublic, fetchStatusByContact } from '../../api/tracking'
import { ApiError } from '../../api/client'
import { useLang } from '../../app/i18n'
import { StatusBadge } from '../../components/ui/Badge'
import type { ClientApplicationStatus } from '../../types'

// ---------------------------------------------------------------------------
// Timeline d'avancement (portée du portail legacy client_status.html)
// ---------------------------------------------------------------------------

const PROGRESS_BY_STATUS: Record<string, number> = {
  SUBMITTED: 20,
  AUTO_KYC_REVIEW: 40,
  AUTO_KYC_OK: 55,
  BLACKMODULE_ALERT: 55,
  COMPLIANCE_REVIEW: 65,
  NEED_MORE_DOCUMENTS: 55,
  APPROVED: 85,
  ACCOUNT_OPENED: 100,
  REJECTED: 100,
}

const STEP_THRESHOLDS: Record<number, number> = { 1: 20, 2: 40, 3: 65, 4: 85, 5: 100 }

const STEP_NUMBERS = [1, 2, 3, 4, 5] as const

function progressForStatus(status: string): number {
  return PROGRESS_BY_STATUS[status] ?? 20
}

type StepState = 'done' | 'current' | 'blocked' | 'todo'

function stepState(status: string, step: number): StepState {
  const progress = progressForStatus(status)
  if (status === 'REJECTED' && step >= 4) return 'blocked'
  if (status === 'NEED_MORE_DOCUMENTS' && step === 3) return 'current'
  if (status === 'BLACKMODULE_ALERT' && step === 3) return 'current'
  if (progress >= STEP_THRESHOLDS[step]) return 'done'
  const previous = step === 1 ? 0 : STEP_THRESHOLDS[step - 1]
  if (progress >= previous) return 'current'
  return 'todo'
}

const STEP_STYLES: Record<StepState, { circle: string; title: string }> = {
  done: { circle: 'bg-emerald-500 text-white', title: 'text-gray-900' },
  current: { circle: 'bg-afriland text-white ring-4 ring-red-100', title: 'text-gray-900' },
  blocked: { circle: 'bg-red-100 text-red-600', title: 'text-gray-400 line-through' },
  todo: { circle: 'bg-gray-100 text-gray-400', title: 'text-gray-400' },
}

// ---------------------------------------------------------------------------
// Détail dépliable d'un dossier
// ---------------------------------------------------------------------------

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

function TrackingDetail({ app }: { app: ClientApplicationStatus }) {
  const { lang, t } = useLang()
  const status = String(app.status)
  const progress = progressForStatus(status)
  const bankMessage = app.client_message || app.review_comment

  // Informations de compte ouvert : consultation publique sécurisée par email.
  const openedQuery = useQuery({
    queryKey: ['tracking', 'opened-account', app.reference],
    queryFn: () => fetchOpenedAccountPublic(app.reference, app.email ?? ''),
    enabled: status === 'ACCOUNT_OPENED' && Boolean(app.email),
    retry: false,
  })

  const accountNumber = openedQuery.data?.account_number ?? app.account_number
  const rib = openedQuery.data?.rib ?? app.final_rib

  return (
    <div className="space-y-5 border-t border-gray-100 px-5 pb-5 pt-4 sm:px-6">
      {/* Barre de progression */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {t('track.progress')}
          </p>
          <span className="text-sm font-extrabold text-afriland">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-afriland to-afriland-dark transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Étapes */}
      <ol className="space-y-3">
        {STEP_NUMBERS.map((step) => {
          const state = stepState(status, step)
          const style = STEP_STYLES[state]
          return (
            <li key={step} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.circle}`}
              >
                {state === 'done' ? '✓' : step}
              </span>
              <div>
                <p className={`text-sm font-semibold ${style.title}`}>{t(`step.${step}.title`)}</p>
                <p className="text-xs text-gray-400">{t(`step.${step}.text`)}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Message de la banque */}
      {bankMessage && (
        <div className="rounded-xl border-l-4 border-afriland bg-red-50/50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {t('track.bank_message')}
          </p>
          <p className="mt-1 text-sm text-gray-800">{bankMessage}</p>
        </div>
      )}

      {/* Informations de compte */}
      {(accountNumber || rib) && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-inset ring-emerald-100">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {t('track.account_info')}
          </p>
          <dl className="mt-2 space-y-1 text-sm text-gray-800">
            {accountNumber && (
              <div>
                <dt className="inline font-semibold">{t('track.account_number')} : </dt>
                <dd className="inline font-mono">{accountNumber}</dd>
              </div>
            )}
            {rib && (
              <div>
                <dt className="inline font-semibold">{t('track.rib')} : </dt>
                <dd className="inline font-mono">{rib}</dd>
              </div>
            )}
            {openedQuery.data?.opened_at && (
              <div>
                <dt className="inline font-semibold">{t('track.opened_at')} : </dt>
                <dd className="inline">
                  {formatDate(openedQuery.data.opened_at, lang === 'fr' ? 'fr-FR' : 'en-GB')}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
      {openedQuery.isError && !accountNumber && !rib && (
        <p className="text-xs text-gray-400">
          {openedQuery.error instanceof ApiError
            ? openedQuery.error.message
            : t('track.account_unavailable')}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page de suivi
// ---------------------------------------------------------------------------

export function StatusTrackingPage() {
  const { t } = useLang()
  const [identifierInput, setIdentifierInput] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [expandedRef, setExpandedRef] = useState<string | null>(null)

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['tracking', 'status-by-contact', identifier],
    queryFn: () => fetchStatusByContact(identifier),
    enabled: identifier.length > 0,
    retry: false,
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const value = identifierInput.trim()
    if (!value) return
    setExpandedRef(null)
    setIdentifier(value)
  }

  const applications = data?.applications ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{t('track.title')}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{t('track.desc')}</p>
      </div>

      {/* Formulaire de recherche : un seul champ */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-card sm:flex-row"
      >
        <input
          type="text"
          inputMode="email"
          autoComplete="email"
          placeholder={t('track.placeholder')}
          aria-label={t('track.placeholder')}
          value={identifierInput}
          onChange={(e) => setIdentifierInput(e.target.value)}
          className="w-full flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-afriland focus:outline-none focus:ring-2 focus:ring-afriland/20"
        />
        <button
          type="submit"
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-afriland px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-afriland-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFetching ? t('track.searching') : t('track.search')}
        </button>
      </form>

      {/* Erreur serveur ({detail}) */}
      {isError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100"
        >
          {error instanceof ApiError ? error.message : t('track.error.generic')}
        </p>
      )}

      {/* Résultats */}
      {applications.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {t('track.found', { count: applications.length, id: data?.identifier ?? '' })}
          </p>

          {applications.map((app) => {
            const expanded = expandedRef === app.reference
            return (
              <div key={app.reference} className="overflow-hidden rounded-2xl bg-white shadow-card">
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {app.reference}
                      </span>
                      <StatusBadge status={String(app.status)} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-gray-700">
                      {app.full_name ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {t('track.agency')} : {app.preferred_branch ?? t('track.not_provided')} ·{' '}
                      {t('track.kyc')} : {app.kyc_score ?? 0}% · {t('track.docscore')} :{' '}
                      {app.document_score ?? 0}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedRef(expanded ? null : app.reference)}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50 sm:self-center"
                    aria-expanded={expanded}
                  >
                    {expanded ? t('track.detail.hide') : t('track.detail.show')}
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    >
                      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                {expanded && <TrackingDetail app={app} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
