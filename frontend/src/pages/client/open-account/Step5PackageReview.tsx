import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchActivePackages } from '../../../api/onboarding'
import { Badge } from '../../../components/ui/Badge'
import { useOaText } from './oaText'
import type { Package } from '../../../types'
import type { useAccountOpeningForm } from './useAccountOpeningForm'

type Ctl = ReturnType<typeof useAccountOpeningForm>

function formatFee(value: number, currency: string | null, freeLabel: string): string {
  if (!value || value <= 0) return freeLabel
  return `${value.toLocaleString('fr-FR')} ${currency ?? ''}`.trim()
}

function RecapRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">{value || '—'}</span>
    </div>
  )
}

export function Step5PackageReview({ ctl }: { ctl: Ctl }) {
  const { t } = useOaText()
  const { form, setSelectedPackage, docs } = ctl

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['ref', 'packages', 'active'],
    queryFn: fetchActivePackages,
    staleTime: 5 * 60_000,
  })

  const capturedDocs = Object.keys(docs)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-extrabold text-gray-900">{t('p5.title')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('p5.desc')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">{t('p3.loading')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg: Package) => {
            const selected = form.selected_package_code === pkg.code
            return (
              <button
                type="button"
                key={pkg.code}
                onClick={() => setSelectedPackage(pkg)}
                className={`flex flex-col rounded-2xl border-2 bg-white p-5 text-left shadow-card transition-colors ${
                  selected ? 'border-afriland' : 'border-transparent hover:border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-extrabold text-gray-900">{pkg.name}</h4>
                  {selected && <Badge tone="red">{t('p5.selected')}</Badge>}
                </div>
                {pkg.description && (
                  <p className="mt-1 text-xs text-gray-500">{pkg.description}</p>
                )}
                {pkg.services?.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {pkg.services.slice(0, 5).map((s) => (
                      <li key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="text-emerald-500">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                )}
                <dl className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-400">{t('p5.opening_fee')}</dt>
                    <dd className="font-semibold text-gray-800">
                      {formatFee(pkg.opening_fee, pkg.currency, t('p5.free'))}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">{t('p5.subscription_fee')}</dt>
                    <dd className="font-semibold text-gray-800">
                      {formatFee(pkg.subscription_fee, pkg.currency, t('p5.free'))}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">{t('p5.monthly_fee')}</dt>
                    <dd className="font-semibold text-gray-800">
                      {formatFee(pkg.monthly_fee, pkg.currency, t('p5.free'))}
                    </dd>
                  </div>
                </dl>
                {pkg.payment_required && (
                  <p className="mt-2 text-[11px] font-semibold text-amber-600">
                    {t('p5.payment_required')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Récapitulatif */}
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
          {t('p5.recap')}
        </h4>
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
          <div>
            <RecapRow
              label={t('p5.recap.identity')}
              value={[form.first_name, form.last_name].filter(Boolean).join(' ')}
            />
            <RecapRow label={t('p1.birth_date')} value={form.birth_date} />
            <RecapRow label={t('p1.nationality')} value={form.nationality} />
            <RecapRow label={t('p5.recap.contact')} value={form.email} />
            <RecapRow label={t('p1.phone')} value={form.phone} />
          </div>
          <div>
            <RecapRow label={t('p5.recap.account')} value={form.account_type} />
            <RecapRow label={t('p3.branch')} value={form.preferred_branch} />
            <RecapRow label={t('p5.recap.activity')} value={form.activity_sector} />
            <RecapRow label={t('p3.income')} value={form.income_range} />
            <RecapRow label={t('p5.recap.documents')} value={`${capturedDocs.length}`} />
          </div>
        </div>
      </div>
    </div>
  )
}
