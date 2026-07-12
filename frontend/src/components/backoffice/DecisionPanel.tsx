import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitDecision } from '../../api/applications'
import { ApiError } from '../../api/client'
import { statusLabel } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Card } from '../ui/Card'
import type { BackofficeDecision } from '../../types'

/** Rôles autorisés à prendre une décision back-office. */
export const DECISION_ROLES = ['GFC', 'DA', 'CONFORMITE', 'ADMIN']

const DECISION_META: Record<
  BackofficeDecision,
  { label: string; variant: 'success' | 'dangerSolid' | 'warning'; confirmText: string }
> = {
  APPROVED: {
    label: 'Approuver le dossier',
    variant: 'success',
    confirmText: 'Le dossier sera marqué comme approuvé et le client sera notifié.',
  },
  REJECTED: {
    label: 'Rejeter le dossier',
    variant: 'dangerSolid',
    confirmText: 'Le dossier sera rejeté. Cette décision sera communiquée au client.',
  },
  NEED_MORE_DOCUMENTS: {
    label: 'Demander un complément',
    variant: 'warning',
    confirmText: 'Le client sera invité à fournir des documents complémentaires.',
  },
}

export function DecisionPanel({ applicationId }: { applicationId: number }) {
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [pending, setPending] = useState<BackofficeDecision | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (decision: BackofficeDecision) =>
      submitDecision(applicationId, {
        decision,
        comment: comment.trim() || undefined,
        client_message: clientMessage.trim() || undefined,
      }),
    onSuccess: (response) => {
      setErrorMsg(null)
      setFeedback(response.message ?? 'Décision enregistrée.')
      setPending(null)
      setComment('')
      setClientMessage('')
      // Invalide le détail et la liste des dossiers (préfixe commun).
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => {
      setFeedback(null)
      setPending(null)
      setErrorMsg(err instanceof ApiError ? err.message : 'Impossible d’enregistrer la décision.')
    },
  })

  return (
    <Card title="Décision">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Enregistrez la décision back-office sur ce dossier. Le commentaire est interne ; le
          message client lui sera communiqué.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Textarea
            label="Commentaire interne (optionnel)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Motif de la décision, éléments vérifiés…"
          />
          <Textarea
            label="Message au client (optionnel)"
            value={clientMessage}
            onChange={(e) => setClientMessage(e.target.value)}
            placeholder="Message affiché au client dans son espace de suivi…"
          />
        </div>

        {feedback && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
            {feedback}
          </p>
        )}
        {errorMsg && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {(Object.keys(DECISION_META) as BackofficeDecision[]).map((decision) => (
            <Button
              key={decision}
              variant={DECISION_META[decision].variant}
              onClick={() => setPending(decision)}
              disabled={mutation.isPending}
            >
              {DECISION_META[decision].label}
            </Button>
          ))}
        </div>
      </div>

      <Modal
        open={pending !== null}
        title="Confirmer la décision"
        onClose={() => setPending(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Annuler
            </Button>
            {pending && (
              <Button
                variant={DECISION_META[pending].variant}
                onClick={() => mutation.mutate(pending)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Enregistrement…' : 'Confirmer'}
              </Button>
            )}
          </>
        }
      >
        {pending && (
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Décision : <strong>{statusLabel(pending)}</strong>
            </p>
            <p>{DECISION_META[pending].confirmText}</p>
            {comment.trim() && (
              <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs">
                <span className="font-semibold">Commentaire interne :</span> {comment.trim()}
              </p>
            )}
            {clientMessage.trim() && (
              <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs">
                <span className="font-semibold">Message client :</span> {clientMessage.trim()}
              </p>
            )}
          </div>
        )}
      </Modal>
    </Card>
  )
}
