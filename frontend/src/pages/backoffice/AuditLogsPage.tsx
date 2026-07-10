import type { FormEvent } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../../api/audit'
import type { AuditFilters } from '../../api/audit'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table, THead, Th, TBody, Tr, Td, EmptyRow } from '../../components/ui/Table'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' })
}

export function AuditLogsPage() {
  const [actorInput, setActorInput] = useState('')
  const [actionInput, setActionInput] = useState('')
  const [filters, setFilters] = useState<AuditFilters>({ limit: 200 })

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters),
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setFilters({
      actor: actorInput.trim() || undefined,
      action: actionInput.trim() || undefined,
      limit: 200,
    })
  }

  const logs = data?.logs ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Journal d'audit</h1>
        <p className="mt-1 text-sm text-gray-500">
          Historique des actions effectuées dans le back-office
          {data ? ` (${data.count} entrées)` : ''}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Input
            label="Acteur"
            placeholder="ex. admin"
            value={actorInput}
            onChange={(e) => setActorInput(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Input
            label="Action"
            placeholder="ex. LOGIN, UPDATE_STATUS…"
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={isFetching}>
          {isFetching ? 'Recherche…' : 'Filtrer'}
        </Button>
      </form>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <Table>
          <THead>
            <Th>Date</Th>
            <Th>Acteur</Th>
            <Th>Action</Th>
            <Th>Cible</Th>
            <Th>Détails</Th>
          </THead>
          <TBody>
            {isLoading && <EmptyRow colSpan={5} message="Chargement du journal…" />}
            {isError && <EmptyRow colSpan={5} message="Impossible de charger le journal d'audit." />}
            {!isLoading && !isError && logs.length === 0 && (
              <EmptyRow colSpan={5} message="Aucune entrée ne correspond aux filtres." />
            )}
            {logs.map((log) => (
              <Tr key={log.id}>
                <Td className="whitespace-nowrap text-xs">{formatDate(log.created_at)}</Td>
                <Td className="font-semibold text-gray-900">{log.actor ?? '—'}</Td>
                <Td>
                  <Badge tone="blue">{log.action ?? '—'}</Badge>
                </Td>
                <Td className="text-xs">{log.target ?? '—'}</Td>
                <Td className="max-w-md truncate text-xs" >
                  <span title={log.details ?? ''}>{log.details ?? '—'}</span>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  )
}
