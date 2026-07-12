import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchApplication, screenBlackmodule } from '../../api/applications'
import { ApiError } from '../../api/client'
import { useSession } from '../../app/guards'
import { AccountOpeningPanel } from '../../components/backoffice/AccountOpeningPanel'
import { DecisionPanel, DECISION_ROLES } from '../../components/backoffice/DecisionPanel'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import type { ApplicationDetail, ApplicationDocument, ScreeningResponse } from '../../types'

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'string') {
    // Date ISO ?
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
      }
    }
    return value
  }
  return String(value)
}

function Field({ label, value, children }: { label: string; value?: unknown; children?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">
        {children ?? formatValue(value)}
      </dd>
    </div>
  )
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
}

function docStatusTone(status: string | null): 'green' | 'orange' | 'red' | 'gray' {
  const value = (status ?? '').toUpperCase()
  if (['VERIFIED', 'OK', 'VALID', 'APPROVED'].includes(value)) return 'green'
  if (['PENDING', 'REVIEW', 'IN_REVIEW'].includes(value)) return 'orange'
  if (['REJECTED', 'FAILED', 'INVALID'].includes(value)) return 'red'
  return 'gray'
}

function DocumentCard({ doc }: { doc: ApplicationDocument }) {
  const isImage = (doc.mime_type ?? '').startsWith('image/')
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-gray-100">
      {doc.content_url && isImage && !doc.is_video ? (
        <a href={doc.content_url} target="_blank" rel="noreferrer" className="block bg-gray-50">
          <img
            src={doc.content_url}
            alt={doc.document_label ?? doc.original_filename ?? 'Document'}
            className="h-44 w-full object-contain"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="flex h-44 items-center justify-center bg-gray-50 text-gray-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12">
            {doc.is_video ? (
              <path d="M15 10l5-3v10l-5-3m-11 4h9a2 2 0 002-2V8a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M9 12h6m-6 4h6M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
      )}
      <div className="space-y-2 p-4">
        <p className="text-sm font-bold text-gray-900">{doc.document_label ?? 'Document'}</p>
        <p className="truncate text-xs text-gray-400" title={doc.original_filename ?? ''}>
          {doc.original_filename ?? '—'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={docStatusTone(doc.verification_status)}>
            {doc.verification_status ?? 'Non vérifié'}
          </Badge>
          {doc.quality_score !== null && (
            <Badge tone="gray">Qualité : {doc.quality_score}</Badge>
          )}
        </div>
        {doc.content_url && (
          <a
            href={doc.content_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-afriland hover:text-afriland-dark hover:underline"
          >
            Ouvrir le document
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
              <path d="M7 13L13 7m0 0H8m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

export function ApplicationDetailPage() {
  const { idOrReference = '' } = useParams()
  const { user } = useSession()
  const queryClient = useQueryClient()
  const [screeningResult, setScreeningResult] = useState<ScreeningResponse | null>(null)
  const [screeningError, setScreeningError] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['applications', idOrReference],
    queryFn: () => fetchApplication(idOrReference),
    enabled: Boolean(idOrReference),
  })

  const screeningMutation = useMutation({
    mutationFn: (applicationId: number) => screenBlackmodule(applicationId),
    onSuccess: (result) => {
      setScreeningError(null)
      setScreeningResult(result)
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    },
    onError: (err) => {
      setScreeningResult(null)
      setScreeningError(err instanceof ApiError ? err.message : 'Screening impossible.')
    },
  })

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-gray-500">Chargement du dossier…</p>
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-card">
        <p className="text-lg font-bold text-gray-900">Dossier introuvable</p>
        <p className="mt-2 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Une erreur est survenue.'}
        </p>
        <Link
          to="/backoffice/applications"
          className="mt-4 inline-block text-sm font-semibold text-afriland hover:underline"
        >
          Retour à la liste des dossiers
        </Link>
      </div>
    )
  }

  const app: ApplicationDetail = data.application
  const documents = data.documents ?? []
  const status = String(app.status)
  const canDecide = DECISION_ROLES.includes(user?.role ?? '')

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/backoffice/applications"
            className="text-xs font-semibold text-gray-400 hover:text-afriland"
          >
            ← Dossiers
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
            {[app.last_name, app.first_name].filter(Boolean).join(' ') || app.reference}
          </h1>
          <p className="mt-0.5 font-mono text-sm text-gray-500">{app.reference}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StatusBadge status={String(app.status)} />
          <p className="text-xs text-gray-400">Créé le {formatValue(app.created_at)}</p>
        </div>
      </div>

      {app.client_message && (
        <div className="rounded-2xl border-l-4 border-afriland bg-white p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Message au client</p>
          <p className="mt-1 text-sm text-gray-800">{app.client_message}</p>
        </div>
      )}

      <Card title="Identité">
        <FieldGrid>
          <Field label="Nom" value={app.last_name} />
          <Field label="Prénom" value={app.first_name} />
          <Field label="Nationalité" value={app.nationality} />
          <Field label="Date de naissance" value={app['birth_date']} />
          <Field label="Lieu de naissance" value={app['birth_place']} />
          <Field label="Sexe" value={app['gender']} />
          <Field label="N° pièce d'identité" value={app['id_number'] ?? app['document_number']} />
          <Field label="Type de pièce" value={app['id_type'] ?? app['document_type']} />
          <Field label="Situation familiale" value={app['marital_status']} />
        </FieldGrid>
      </Card>

      <Card title="Contact">
        <FieldGrid>
          <Field label="Email" value={app.email} />
          <Field label="Téléphone" value={app.phone} />
          <Field label="Pays de résidence" value={app['residence_country'] ?? app['country_of_residence']} />
          <Field label="Ville" value={app['city']} />
          <Field label="Adresse" value={app['address']} />
          <Field label="Agence souhaitée" value={app.preferred_branch} />
        </FieldGrid>
      </Card>

      <Card title="Activité & revenus">
        <FieldGrid>
          <Field label="Profession" value={app['profession'] ?? app['occupation']} />
          <Field label="Employeur" value={app['employer']} />
          <Field label="Secteur d'activité" value={app['activity_sector'] ?? app['business_sector']} />
          <Field label="Revenu mensuel" value={app['monthly_income']} />
          <Field label="Origine des fonds" value={app['funds_origin'] ?? app['source_of_funds']} />
          <Field label="Type de compte" value={app.account_type} />
        </FieldGrid>
      </Card>

      <Card title="Package & paiement">
        <FieldGrid>
          <Field label="Package sélectionné" value={app.selected_package_label ?? app.selected_package_code} />
          <Field label="Prix du package" value={app.selected_package_price} />
          <Field label="Statut du paiement" value={app.package_payment_status} />
          <Field label="Référence de paiement" value={app.package_payment_reference} />
          <Field label="Montant payé" value={app.package_payment_amount} />
          <Field label="Payé le" value={app.package_payment_at} />
          <Field label="Numéro de compte" value={app.account_number} />
          <Field label="RIB final" value={app.final_rib} />
        </FieldGrid>
      </Card>

      <Card
        title="Scores & conformité"
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => screeningMutation.mutate(app.id)}
            disabled={screeningMutation.isPending}
          >
            {screeningMutation.isPending ? 'Screening en cours…' : 'Lancer le screening'}
          </Button>
        }
      >
        <div className="space-y-4">
          {screeningResult && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
              {screeningResult.message ?? 'Screening terminé.'}
              {screeningResult.blackmodule_status
                ? ` Statut : ${screeningResult.blackmodule_status}`
                : ''}
              {screeningResult.blackmodule_score !== null &&
              screeningResult.blackmodule_score !== undefined
                ? ` — Score : ${screeningResult.blackmodule_score}`
                : ''}
            </p>
          )}
          {screeningError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
              {screeningError}
            </p>
          )}
          <FieldGrid>
            <Field label="Score KYC" value={app.kyc_score} />
            <Field label="Score documents" value={app.document_score} />
            <Field label="Niveau de risque">
              <Badge
                tone={
                  ['HIGH', 'ELEVE', 'ÉLEVÉ'].includes((app.risk_level ?? '').toUpperCase())
                    ? 'red'
                    : ['MEDIUM', 'MOYEN'].includes((app.risk_level ?? '').toUpperCase())
                      ? 'orange'
                      : app.risk_level
                        ? 'green'
                        : 'gray'
                }
              >
                {app.risk_level ?? '—'}
              </Badge>
            </Field>
            <Field label="Statut BlackModule" value={app.blackmodule_status} />
            <Field label="Score BlackModule" value={app['blackmodule_score']} />
            <Field label="Alerte BlackModule" value={app['blackmodule_alert']} />
          </FieldGrid>
        </div>
      </Card>

      {(status === 'APPROVED' || status === 'ACCOUNT_OPENED') && (
        <AccountOpeningPanel reference={app.reference} status={status} canAct={canDecide} />
      )}

      {canDecide && <DecisionPanel applicationId={app.id} />}

      <Card title={`Documents (${documents.length})`}>
        {documents.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Aucun document rattaché à ce dossier.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
