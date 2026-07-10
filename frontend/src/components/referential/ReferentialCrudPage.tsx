import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input, Toggle } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Table, THead, Th, TBody, Tr, Td, EmptyRow } from '../ui/Table'

export interface FieldConfig<T> {
  /** Clé du champ dans le payload snake_case. */
  name: keyof T & string
  label: string
  type?: 'text' | 'number'
  required?: boolean
  placeholder?: string
}

export interface ColumnConfig<T> {
  header: string
  render: (item: T) => ReactNode
}

interface ReferentialCrudPageProps<T extends { id: number; active: boolean }> {
  title: string
  subtitle: string
  queryKey: string
  api: {
    list: () => Promise<T[]>
    create: (payload: Omit<T, 'id'>) => Promise<T>
    update: (id: number, payload: Omit<T, 'id'>) => Promise<T>
    remove: (id: number) => Promise<void>
  }
  fields: FieldConfig<Omit<T, 'id' | 'active'>>[]
  columns: ColumnConfig<T>[]
  itemLabel: (item: T) => string
}

export function ReferentialCrudPage<T extends { id: number; active: boolean }>({
  title,
  subtitle,
  queryKey,
  api,
  fields,
  columns,
  itemLabel,
}: ReferentialCrudPageProps<T>) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: [queryKey],
    queryFn: api.list,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] })
  const onError = (err: unknown) =>
    setErrorMsg(err instanceof ApiError ? err.message : 'Opération impossible.')

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: Omit<T, 'id'> }) =>
      id === null ? api.create(payload) : api.update(id, payload),
    onSuccess: () => {
      setErrorMsg(null)
      setModalOpen(false)
      setEditing(null)
      invalidate()
    },
    onError,
  })

  const toggleMutation = useMutation({
    mutationFn: (item: T) => {
      const { id, ...rest } = item
      void id
      return api.update(item.id, { ...rest, active: !item.active } as Omit<T, 'id'>)
    },
    onSuccess: () => {
      setErrorMsg(null)
      invalidate()
    },
    onError,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: () => {
      setErrorMsg(null)
      invalidate()
    },
    onError,
  })

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (item: T) => {
    setEditing(item)
    setModalOpen(true)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload: Record<string, unknown> = { active: editing?.active ?? true }
    for (const field of fields) {
      const raw = String(form.get(field.name) ?? '').trim()
      payload[field.name] = field.type === 'number' ? (raw === '' ? null : Number(raw)) : raw
    }
    saveMutation.mutate({ id: editing?.id ?? null, payload: payload as Omit<T, 'id'> })
  }

  const handleDelete = (item: T) => {
    if (window.confirm(`Supprimer « ${itemLabel(item)} » ? Cette action est définitive.`)) {
      deleteMutation.mutate(item.id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <Button onClick={openCreate}>+ Ajouter</Button>
      </div>

      {errorMsg && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100">
          {errorMsg}
        </p>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <Table>
          <THead>
            {columns.map((col) => (
              <Th key={col.header}>{col.header}</Th>
            ))}
            <Th>Actif</Th>
            <Th className="text-right">Actions</Th>
          </THead>
          <TBody>
            {isLoading && <EmptyRow colSpan={columns.length + 2} message="Chargement…" />}
            {isError && (
              <EmptyRow colSpan={columns.length + 2} message="Impossible de charger les données." />
            )}
            {!isLoading && !isError && items.length === 0 && (
              <EmptyRow colSpan={columns.length + 2} message="Aucun élément." />
            )}
            {items.map((item) => (
              <Tr key={item.id}>
                {columns.map((col) => (
                  <Td key={col.header}>{col.render(item)}</Td>
                ))}
                <Td>
                  <div className="flex items-center gap-2">
                    <Toggle checked={item.active} onChange={() => toggleMutation.mutate(item)} />
                    <Badge tone={item.active ? 'green' : 'gray'}>
                      {item.active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>
                      Modifier
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(item)}
                      disabled={deleteMutation.isPending}
                    >
                      Supprimer
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? `Modifier — ${itemLabel(editing)}` : 'Ajouter un élément'}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <Input
              key={field.name}
              label={field.label}
              name={field.name}
              type={field.type ?? 'text'}
              required={field.required}
              placeholder={field.placeholder}
              defaultValue={
                editing ? String((editing as Record<string, unknown>)[field.name] ?? '') : ''
              }
            />
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setEditing(null)
              }}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
