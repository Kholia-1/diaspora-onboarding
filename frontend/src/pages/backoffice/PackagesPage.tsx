import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPackages, savePackages } from '../../api/backofficeConfig'
import { ApiError } from '../../api/client'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input'
import type { BackofficePackage } from '../../types'

const CURRENCIES = ['XAF', 'EUR', 'USD']
const CUSTOMER_TYPES = ['TOUS', 'PARTICULIER', 'PROFESSIONNEL', 'ENTREPRISE', 'DIASPORA']

function toNumber(value: string | number): number {
  const n = Number(String(value ?? '0').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function formatMoney(value: number, currency: string): string {
  return `${toNumber(value).toLocaleString('fr-FR')} ${currency || 'XAF'}`
}

function makeDefaultPackage(count: number): BackofficePackage {
  const index = count + 1
  return {
    code: `PACKAGE_${index}`,
    name: `Nouveau package ${index}`,
    description: '',
    services: [],
    currency: 'XAF',
    opening_fee: 0,
    subscription_fee: 0,
    monthly_fee: 0,
    payment_required: false,
    active: true,
    display_order: index,
    customer_type: 'TOUS',
    mastercard_item_code: `PACKAGE_${index}`,
    whatsapp_template: `package_${index}_selected`,
  }
}

/** Champ du formulaire package : label au-dessus + largeur configurable. */
function Field({
  label,
  span = 1,
  children,
}: {
  label: string
  span?: 1 | 2 | 4
  children: React.ReactNode
}) {
  const spanClass = span === 4 ? 'sm:col-span-2 lg:col-span-4' : span === 2 ? 'lg:col-span-2' : ''
  return (
    <div className={spanClass}>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function PackageCard({
  pkg,
  onChange,
  onRemove,
}: {
  pkg: BackofficePackage
  onChange: (patch: Partial<BackofficePackage>) => void
  onRemove: () => void
}) {
  return (
    <section className="rounded-2xl bg-white shadow-card">
      <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">{pkg.name || 'Package'}</h3>
          <p className="font-mono text-xs font-bold text-gray-400">{pkg.code}</p>
        </div>
        <Badge tone={pkg.active ? 'green' : 'gray'}>{pkg.active ? 'Actif' : 'Inactif'}</Badge>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Code package">
            <Input value={pkg.code} onChange={(e) => onChange({ code: e.target.value })} />
          </Field>
          <Field label="Nom package">
            <Input value={pkg.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Ordre d'affichage">
            <Input
              type="number"
              value={pkg.display_order}
              onChange={(e) => onChange({ display_order: Number(e.target.value || 0) })}
            />
          </Field>
          <Field label="Devise">
            <Select value={pkg.currency} onChange={(e) => onChange({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description" span={4}>
            <Textarea
              value={pkg.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>

          <Field label="Services inclus — un service par ligne" span={4}>
            <Textarea
              value={(pkg.services ?? []).join('\n')}
              onChange={(e) =>
                onChange({
                  services: e.target.value
                    .split('\n')
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>

          <Field label="Frais d'ouverture">
            <Input
              type="number"
              min={0}
              step={1}
              value={pkg.opening_fee}
              onChange={(e) => onChange({ opening_fee: toNumber(e.target.value) })}
            />
          </Field>
          <Field label="Frais de souscription">
            <Input
              type="number"
              min={0}
              step={1}
              value={pkg.subscription_fee}
              onChange={(e) => onChange({ subscription_fee: toNumber(e.target.value) })}
            />
          </Field>
          <Field label="Frais mensuels">
            <Input
              type="number"
              min={0}
              step={1}
              value={pkg.monthly_fee}
              onChange={(e) => onChange({ monthly_fee: toNumber(e.target.value) })}
            />
          </Field>
          <Field label="Type clientèle">
            <Select
              value={pkg.customer_type}
              onChange={(e) => onChange({ customer_type: e.target.value })}
            >
              {CUSTOMER_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Code article Mastercard" span={2}>
            <Input
              value={pkg.mastercard_item_code}
              onChange={(e) => onChange({ mastercard_item_code: e.target.value })}
            />
          </Field>
          <Field label="Template WhatsApp" span={2}>
            <Input
              value={pkg.whatsapp_template}
              onChange={(e) => onChange({ whatsapp_template: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-6">
          <Toggle
            checked={pkg.active}
            onChange={(v) => onChange({ active: v })}
            label="Package actif"
          />
          <Toggle
            checked={pkg.payment_required}
            onChange={(v) => onChange({ payment_required: v })}
            label="Paiement requis"
          />
          <Button variant="danger" size="sm" className="ml-auto" onClick={onRemove}>
            Supprimer
          </Button>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          Ouverture : {formatMoney(pkg.opening_fee, pkg.currency)} | Souscription :{' '}
          {formatMoney(pkg.subscription_fee, pkg.currency)} | Mensuel :{' '}
          {formatMoney(pkg.monthly_fee, pkg.currency)}
        </div>
      </div>
    </section>
  )
}

export function PackagesPage() {
  const [packages, setPackages] = useState<BackofficePackage[]>([])
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['bo', 'packages'],
    queryFn: fetchPackages,
  })

  useEffect(() => {
    if (data?.packages) setPackages(data.packages)
  }, [data])

  const updatePackage = (index: number, patch: Partial<BackofficePackage>) => {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const addPackage = () => setPackages((prev) => [...prev, makeDefaultPackage(prev.length)])

  const removePackage = (index: number) => {
    if (!window.confirm('Supprimer ce package ?')) return
    setPackages((prev) => prev.filter((_, i) => i !== index))
  }

  const reload = () => {
    setMessage(null)
    refetch()
  }

  const handleSave = async () => {
    if (!packages.length) {
      setMessage({ text: 'Ajoutez au moins un package.', ok: false })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await savePackages(packages)
      setPackages(res.packages ?? packages)
      setMessage({ text: res.message ?? 'Configuration enregistrée avec succès.', ok: true })
    } catch (err) {
      setMessage({
        text: err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.",
        ok: false,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Configuration manuelle des packages
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Cette page permet de configurer les packages proposés au client lors de l'ouverture de
          compte. Ces informations serviront ensuite à l'affichage client, au paiement Mastercard et
          aux notifications WhatsApp.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={addPackage}>Ajouter un package</Button>
        <Button variant="secondary" onClick={reload} disabled={isFetching}>
          {isFetching ? 'Rechargement…' : 'Recharger'}
        </Button>
        <Button variant="success" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
        </Button>
      </div>

      {message && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-medium ring-1 ring-inset ${
            message.ok
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
              : 'bg-red-50 text-red-700 ring-red-100'
          }`}
        >
          {message.text}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : isError ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-red-600 shadow-card">
          Impossible de charger les packages.
        </p>
      ) : packages.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-400 shadow-card">
          Aucun package configuré.
        </p>
      ) : (
        <div className="space-y-5">
          {packages.map((pkg, index) => (
            <PackageCard
              key={index}
              pkg={pkg}
              onChange={(patch) => updatePackage(index, patch)}
              onRemove={() => removePackage(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
