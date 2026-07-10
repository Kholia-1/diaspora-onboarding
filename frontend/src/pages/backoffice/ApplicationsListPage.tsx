import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchApplications } from '../../api/applications'
import { StatusBadge, statusLabel, Badge } from '../../components/ui/Badge'
import type { BadgeTone } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { Table, THead, Th, TBody, Tr, Td, EmptyRow } from '../../components/ui/Table'

const ALL_STATUSES = [
  'SUBMITTED',
  'AUTO_KYC_OK',
  'AUTO_KYC_REVIEW',
  'BLACKMODULE_ALERT',
  'COMPLIANCE_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEED_MORE_DOCUMENTS',
  'ACCOUNT_OPENED',
]

function riskTone(risk: string | null): BadgeTone {
  const value = (risk ?? '').toUpperCase()
  if (['HIGH', 'ELEVE', 'ÉLEVÉ'].includes(value)) return 'red'
  if (['MEDIUM', 'MOYEN'].includes(value)) return 'orange'
  if (['LOW', 'FAIBLE'].includes(value)) return 'green'
  return 'gray'
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ApplicationsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: applications = [], isLoading, isError } = useQuery({
    queryKey: ['applications'],
    queryFn: fetchApplications,
  })

  const stats = useMemo(() => {
    const submitted = applications.filter((a) => a.status === 'SUBMITTED').length
    const alerts = applications.filter((a) =>
      ['BLACKMODULE_ALERT', 'COMPLIANCE_REVIEW'].includes(String(a.status)),
    ).length
    const approved = applications.filter((a) =>
      ['APPROVED', 'ACCOUNT_OPENED'].includes(String(a.status)),
    ).length
    return { total: applications.length, submitted, alerts, approved }
  }, [applications])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return applications.filter((app) => {
      if (statusFilter && app.status !== statusFilter) return false
      if (!term) return true
      const haystack = [
        app.reference,
        app.last_name,
        app.first_name,
        app.email,
        app.phone,
        app.nationality,
        app.preferred_branch,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [applications, search, statusFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Dossiers d'ouverture de compte</h1>
        <p className="mt-1 text-sm text-gray-500">
          Suivi des demandes d'ouverture de compte diaspora
        </p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Dossiers au total"
          value={stats.total}
          accent="bg-gray-100 text-gray-700"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Dossiers soumis"
          value={stats.submitted}
          accent="bg-blue-100 text-blue-700"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M12 4v10m0-10l-4 4m4-4l4 4M5 18h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Alertes conformité"
          value={stats.alerts}
          accent="bg-red-100 text-red-700"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M12 9v4m0 4h.01M10.3 4.3L2.8 18a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Dossiers approuvés"
          value={stats.approved}
          accent="bg-emerald-100 text-emerald-700"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card sm:flex-row">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Rechercher (référence, nom, email, téléphone…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Recherche"
          />
        </div>
        <div className="sm:w-64">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            {ALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <Table>
          <THead>
            <Th>Référence</Th>
            <Th>Client</Th>
            <Th>Contact</Th>
            <Th>Statut</Th>
            <Th>Risque</Th>
            <Th className="text-right">Score KYC</Th>
            <Th>Agence</Th>
            <Th>Créé le</Th>
          </THead>
          <TBody>
            {isLoading && <EmptyRow colSpan={8} message="Chargement des dossiers…" />}
            {isError && <EmptyRow colSpan={8} message="Impossible de charger les dossiers." />}
            {!isLoading && !isError && filtered.length === 0 && (
              <EmptyRow colSpan={8} message="Aucun dossier ne correspond aux critères." />
            )}
            {filtered.map((app) => (
              <Tr
                key={app.id}
                clickable
                onClick={() => navigate(`/backoffice/applications/${app.reference || app.id}`)}
              >
                <Td className="font-mono text-xs font-semibold text-gray-900">{app.reference}</Td>
                <Td>
                  <span className="font-semibold text-gray-900">
                    {[app.last_name, app.first_name].filter(Boolean).join(' ') || '—'}
                  </span>
                  <span className="block text-xs text-gray-400">{app.nationality ?? ''}</span>
                </Td>
                <Td>
                  <span className="block text-xs">{app.email ?? '—'}</span>
                  <span className="block text-xs text-gray-400">{app.phone ?? ''}</span>
                </Td>
                <Td>
                  <StatusBadge status={String(app.status)} />
                </Td>
                <Td>
                  <Badge tone={riskTone(app.risk_level)}>{app.risk_level ?? '—'}</Badge>
                </Td>
                <Td className="text-right font-semibold tabular-nums">
                  {app.kyc_score ?? '—'}
                </Td>
                <Td className="text-xs">{app.preferred_branch ?? '—'}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(app.created_at)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
        {!isLoading && !isError && (
          <p className="mt-3 text-xs text-gray-400">
            {filtered.length} dossier{filtered.length > 1 ? 's' : ''} affiché
            {filtered.length > 1 ? 's' : ''} sur {applications.length}
          </p>
        )}
      </div>
    </div>
  )
}
