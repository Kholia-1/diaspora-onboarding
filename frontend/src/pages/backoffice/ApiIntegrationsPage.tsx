import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchApiIntegrations,
  saveApiIntegrations,
  testApiIntegration,
} from '../../api/backofficeConfig'
import { ApiError } from '../../api/client'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input'
import type { ApiIntegration, IntegrationTestResult } from '../../types'

const ENVIRONMENTS = ['SANDBOX', 'PRODUCTION', 'INTERNAL']
const AUTH_TYPES = ['API_KEY', 'BEARER_TOKEN', 'OAUTH2', 'BASIC', 'NONE']

interface TestState {
  loading: boolean
  result: IntegrationTestResult | null
  error: string | null
}

/** Couleur du bloc résultat de test (parité testResultClass du legacy). */
function testTone(status: string, success: boolean): 'ok' | 'warning' | 'error' {
  if (success) return 'ok'
  if (status === 'DISABLED' || status === 'CONFIG_INCOMPLETE') return 'warning'
  return 'error'
}

const TEST_TONE_CLASSES: Record<'ok' | 'warning' | 'error', string> = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-amber-100',
  error: 'bg-red-50 text-red-800 ring-red-100',
}

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

function IntegrationCard({
  item,
  onChange,
  onTest,
  test,
}: {
  item: ApiIntegration
  onChange: (patch: Partial<ApiIntegration>) => void
  onTest: () => void
  test: TestState | undefined
}) {
  // Champ combiné Merchant ID / Phone ID selon le code (parité legacy).
  const merchantOrPhone = item.phone_number_id || item.merchant_id || ''
  const onMerchantOrPhone = (value: string) => {
    if (item.code === 'WHATSAPP') onChange({ phone_number_id: value })
    else if (item.code === 'MASTERCARD') onChange({ merchant_id: value })
    else onChange({ merchant_id: value })
  }

  return (
    <section className="rounded-2xl bg-white shadow-card">
      <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">{item.name || item.code}</h3>
          <p className="font-mono text-xs font-bold text-gray-400">
            {item.code} — {item.provider}
          </p>
        </div>
        <Badge tone={item.enabled ? 'green' : 'gray'}>
          {item.enabled ? 'Activée' : 'Désactivée'}
        </Badge>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Code">
            <Input value={item.code} readOnly className="bg-gray-50 text-gray-500" />
          </Field>
          <Field label="Nom">
            <Input value={item.name} onChange={(e) => onChange({ name: e.target.value })} />
          </Field>
          <Field label="Environnement">
            <Select
              value={item.environment}
              onChange={(e) => onChange({ environment: e.target.value })}
            >
              {ENVIRONMENTS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type auth">
            <Select value={item.auth_type} onChange={(e) => onChange({ auth_type: e.target.value })}>
              {AUTH_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description" span={4}>
            <Textarea
              value={item.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>

          <Field label="Base URL" span={2}>
            <Input value={item.base_url} onChange={(e) => onChange({ base_url: e.target.value })} />
          </Field>
          <Field label="Provider" span={2}>
            <Input value={item.provider} onChange={(e) => onChange({ provider: e.target.value })} />
          </Field>

          <Field label="API Key / Token">
            <Input value={item.api_key} onChange={(e) => onChange({ api_key: e.target.value })} />
          </Field>
          <Field label="Client ID">
            <Input
              value={item.client_id}
              onChange={(e) => onChange({ client_id: e.target.value })}
            />
          </Field>
          <Field label="Client Secret">
            <Input
              value={item.client_secret}
              onChange={(e) => onChange({ client_secret: e.target.value })}
            />
          </Field>
          <Field label="Merchant ID / Phone ID">
            <Input value={merchantOrPhone} onChange={(e) => onMerchantOrPhone(e.target.value)} />
          </Field>

          <Field label="Webhook URL" span={2}>
            <Input
              value={item.webhook_url}
              onChange={(e) => onChange({ webhook_url: e.target.value })}
            />
          </Field>
          <Field label="Callback URL" span={2}>
            <Input
              value={item.callback_url}
              onChange={(e) => onChange({ callback_url: e.target.value })}
            />
          </Field>

          <Field label="Notes / usage métier" span={4}>
            <Textarea value={item.notes} onChange={(e) => onChange({ notes: e.target.value })} />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-6">
          <Toggle
            checked={item.enabled}
            onChange={(v) => onChange({ enabled: v })}
            label="Intégration activée"
          />
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto bg-gray-900! text-white! ring-0! hover:bg-black!"
            onClick={onTest}
            disabled={test?.loading}
          >
            {test?.loading ? 'Test en cours…' : 'Tester la connexion'}
          </Button>
        </div>

        {test && (test.result || test.error) && (
          <div className="mt-4">
            {test.error ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 ring-1 ring-inset ring-red-100">
                Erreur lors du test : {test.error}
              </div>
            ) : (
              test.result && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${
                    TEST_TONE_CLASSES[testTone(test.result.status, test.result.success)]
                  }`}
                >
                  <p className="font-bold">{test.result.status}</p>
                  <p className="mt-0.5">{test.result.message}</p>
                  {test.result.missing_fields && test.result.missing_fields.length > 0 && (
                    <p className="mt-0.5">
                      Champs manquants : {test.result.missing_fields.join(', ')}
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export function ApiIntegrationsPage() {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([])
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [tests, setTests] = useState<Record<string, TestState>>({})

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['bo', 'api-integrations'],
    queryFn: fetchApiIntegrations,
  })

  useEffect(() => {
    if (data?.integrations) setIntegrations(data.integrations)
  }, [data])

  const updateIntegration = (index: number, patch: Partial<ApiIntegration>) => {
    setIntegrations((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const reload = () => {
    setMessage(null)
    refetch()
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await saveApiIntegrations(integrations)
      setIntegrations(res.integrations ?? integrations)
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

  const handleTest = async (item: ApiIntegration) => {
    setTests((prev) => ({ ...prev, [item.code]: { loading: true, result: null, error: null } }))
    try {
      const result = await testApiIntegration(item.code)
      setTests((prev) => ({ ...prev, [item.code]: { loading: false, result, error: null } }))
    } catch (err) {
      setTests((prev) => ({
        ...prev,
        [item.code]: {
          loading: false,
          result: null,
          error: err instanceof ApiError ? err.message : 'Test impossible.',
        },
      }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Paramétrage des intégrations API
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Cette page centralise la configuration des API externes utilisées par le parcours
          diaspora : WhatsApp, Mastercard et BLACKMODULE.
        </p>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        Important : pour une mise en production, les vrais secrets API doivent être stockés dans un
        coffre sécurisé ou dans des variables d'environnement protégées, pas dans Git.
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="success" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
        </Button>
        <Button variant="secondary" onClick={reload} disabled={isFetching}>
          {isFetching ? 'Rechargement…' : 'Recharger'}
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
          Impossible de charger les intégrations API.
        </p>
      ) : integrations.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-gray-400 shadow-card">
          Aucune intégration configurée.
        </p>
      ) : (
        <div className="space-y-5">
          {integrations.map((item, index) => (
            <IntegrationCard
              key={item.code || index}
              item={item}
              onChange={(patch) => updateIntegration(index, patch)}
              onTest={() => handleTest(item)}
              test={tests[item.code]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
