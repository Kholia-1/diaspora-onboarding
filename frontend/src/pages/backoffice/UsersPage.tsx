import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser, fetchRoles, fetchUsers, updateUser } from '../../api/users'
import { ApiError } from '../../api/client'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Select, Toggle } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table, THead, Th, TBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import type { BackofficeUser, UpdateUserPayload } from '../../types'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<BackofficeUser | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const { data: rolesData } = useQuery({ queryKey: ['users', 'roles'], queryFn: fetchRoles })
  const roles = rolesData?.roles ?? []

  const onMutationError = (err: unknown) => {
    setFeedback(null)
    setErrorMsg(err instanceof ApiError ? err.message : 'Opération impossible.')
  }

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => {
      setErrorMsg(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: onMutationError,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      setErrorMsg(null)
      setFeedback('Utilisateur créé avec succès.')
      setCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: onMutationError,
  })

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      updateUser(id, { password }),
    onSuccess: () => {
      setErrorMsg(null)
      setFeedback('Mot de passe réinitialisé.')
      setResetTarget(null)
    },
    onError: onMutationError,
  })

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    createMutation.mutate({
      username: String(form.get('username') ?? '').trim(),
      full_name: String(form.get('full_name') ?? '').trim(),
      role: String(form.get('role') ?? ''),
      password: String(form.get('password') ?? ''),
    })
  }

  const handleReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetTarget) return
    const form = new FormData(event.currentTarget)
    resetMutation.mutate({ id: resetTarget.id, password: String(form.get('password') ?? '') })
  }

  const users = data?.users ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestion des comptes du back-office ({data?.count ?? 0})
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Nouvel utilisateur</Button>
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

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <Table>
          <THead>
            <Th>Identifiant</Th>
            <Th>Nom complet</Th>
            <Th>Rôle</Th>
            <Th>Statut</Th>
            <Th>Dernière connexion</Th>
            <Th>Créé le</Th>
            <Th className="text-right">Actions</Th>
          </THead>
          <TBody>
            {isLoading && <EmptyRow colSpan={7} message="Chargement des utilisateurs…" />}
            {isError && <EmptyRow colSpan={7} message="Impossible de charger les utilisateurs." />}
            {!isLoading && !isError && users.length === 0 && (
              <EmptyRow colSpan={7} message="Aucun utilisateur." />
            )}
            {users.map((user) => (
              <Tr key={user.id}>
                <Td className="font-semibold text-gray-900">{user.username}</Td>
                <Td>{user.full_name}</Td>
                <Td>
                  <Select
                    value={user.role}
                    aria-label={`Rôle de ${user.username}`}
                    className="w-auto! min-w-36 py-1.5! text-xs!"
                    onChange={(e) =>
                      patchMutation.mutate({ id: user.id, payload: { role: e.target.value } })
                    }
                  >
                    {roles.map((role) => (
                      <option key={role.code} value={role.code}>
                        {role.label}
                      </option>
                    ))}
                    {!roles.some((r) => r.code === user.role) && (
                      <option value={user.role}>{user.role_label || user.role}</option>
                    )}
                  </Select>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={user.active}
                      onChange={(active) =>
                        patchMutation.mutate({ id: user.id, payload: { active } })
                      }
                    />
                    <Badge tone={user.active ? 'green' : 'gray'}>
                      {user.active ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(user.last_login_at)}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(user.created_at)}</Td>
                <Td className="text-right">
                  <Button variant="secondary" size="sm" onClick={() => setResetTarget(user)}>
                    Réinitialiser le mot de passe
                  </Button>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>

      {/* Modale de création */}
      <Modal open={createOpen} title="Nouvel utilisateur" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Identifiant" name="username" required autoComplete="off" />
          <Input label="Nom complet" name="full_name" required />
          <Select label="Rôle" name="role" required defaultValue={roles[0]?.code ?? ''}>
            {roles.map((role) => (
              <option key={role.code} value={role.code}>
                {role.label}
              </option>
            ))}
          </Select>
          <Input
            label="Mot de passe"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modale de réinitialisation du mot de passe */}
      <Modal
        open={resetTarget !== null}
        title={`Réinitialiser le mot de passe — ${resetTarget?.username ?? ''}`}
        onClose={() => setResetTarget(null)}
      >
        <form onSubmit={handleReset} className="space-y-4">
          <Input
            label="Nouveau mot de passe"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setResetTarget(null)}>
              Annuler
            </Button>
            <Button type="submit" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? 'Enregistrement…' : 'Réinitialiser'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
