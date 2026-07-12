import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchOpenedAccount, openAccount } from '../../api/applications'
import { ApiError } from '../../api/client'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function AccountOpeningPanel({
  reference,
  status,
  canAct,
}: {
  reference: string
  status: string
  canAct: boolean
}) {
  const queryClient = useQueryClient()
  const [accountNumber, setAccountNumber] = useState('')
  const [rib, setRib] = useState('')
  const [comment, setComment] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 404 = pas encore de compte ouvert : ce n'est pas une erreur bloquante.
  const openedQuery = useQuery({
    queryKey: ['applications', reference, 'opened-account'],
    queryFn: () => fetchOpenedAccount(reference),
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: () =>
      openAccount(reference, {
        account_number: accountNumber.trim(),
        rib: rib.trim(),
        comment: comment.trim() || undefined,
      }),
    onSuccess: (response) => {
      setErrorMsg(null)
      setSuccessMsg(response.message ?? 'Compte ouvert avec succès.')
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => {
      setSuccessMsg(null)
      setErrorMsg(err instanceof ApiError ? err.message : 'Impossible d’ouvrir le compte.')
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  const account = openedQuery.data

  return (
    <Card title="Ouverture de compte">
      {account ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge tone="green">Compte ouvert</Badge>
            {account.status && <Badge tone="gray">{account.status}</Badge>}
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Numéro de compte
              </dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-gray-900">
                {account.account_number ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">RIB</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-gray-900">
                {account.rib ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Ouvert le
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {formatDate(account.created_at)}
              </dd>
            </div>
          </dl>
          {successMsg && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
              {successMsg}
            </p>
          )}
        </div>
      ) : openedQuery.isLoading ? (
        <p className="text-sm text-gray-400">Vérification du compte…</p>
      ) : canAct && status === 'APPROVED' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Le dossier est approuvé. Saisissez le numéro de compte attribué par le Core Banking et
            le RIB pour finaliser l'ouverture.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Input
              label="Numéro de compte"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="ex. 10005-00001-00123456789-25"
            />
            <Input
              label="RIB"
              required
              value={rib}
              onChange={(e) => setRib(e.target.value)}
              placeholder="RIB communiqué au client"
            />
          </div>
          <Input
            label="Commentaire (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {errorMsg && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
              {errorMsg}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Ouverture en cours…' : 'Ouvrir le compte'}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-gray-400">
          {status === 'APPROVED'
            ? 'Aucun compte ouvert pour ce dossier pour le moment.'
            : 'Le compte pourra être ouvert une fois le dossier approuvé.'}
        </p>
      )}
    </Card>
  )
}
