import { useQuery } from '@tanstack/react-query'
import {
  fetchActiveAgencies,
  fetchActiveSectors,
  fetchSubsectorsBySector,
} from '../../../api/onboarding'
import { Input, Select } from '../../../components/ui/Input'
import {
  ACCOUNT_TYPE_OPTIONS,
  INCOME_RANGE_OPTIONS,
  optionLabel,
} from './constants'
import { useOaText } from './oaText'
import type { useAccountOpeningForm } from './useAccountOpeningForm'

type Ctl = ReturnType<typeof useAccountOpeningForm>

export function Step3Activity({ ctl }: { ctl: Ctl }) {
  const { t, lang } = useOaText()
  const { form, setField, setFields } = ctl

  const { data: sectors = [] } = useQuery({
    queryKey: ['ref', 'sectors', 'active'],
    queryFn: fetchActiveSectors,
    staleTime: 5 * 60_000,
  })
  const { data: agencies = [] } = useQuery({
    queryKey: ['ref', 'agencies', 'active'],
    queryFn: fetchActiveAgencies,
    staleTime: 5 * 60_000,
  })
  const { data: subsectors = [] } = useQuery({
    queryKey: ['ref', 'subsectors', form.activity_sector_code],
    queryFn: () => fetchSubsectorsBySector(form.activity_sector_code),
    enabled: Boolean(form.activity_sector_code),
    staleTime: 5 * 60_000,
  })

  const onSectorChange = (code: string) => {
    const sector = sectors.find((s) => s.code === code)
    setFields({
      activity_sector_code: code,
      activity_sector: sector?.name ?? '',
      activity_subsector_code: '',
      activity_subsector: '',
    })
  }

  const onSubsectorChange = (code: string) => {
    const sub = subsectors.find((s) => s.code === code)
    setFields({
      activity_subsector_code: code,
      activity_subsector: sub?.label ?? '',
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select
        label={t('p3.account_type')}
        value={form.account_type}
        onChange={(e) => setField('account_type', e.target.value)}
        required
      >
        <option value="">{t('p1.select')}</option>
        {ACCOUNT_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {optionLabel(o, lang)}
          </option>
        ))}
      </Select>

      <Select
        label={t('p3.branch')}
        value={form.preferred_branch}
        onChange={(e) => setField('preferred_branch', e.target.value)}
      >
        <option value="">{t('p1.select')}</option>
        {agencies.map((a) => (
          <option key={a.id} value={a.name}>
            {a.name}
            {a.city ? ` — ${a.city}` : ''}
          </option>
        ))}
      </Select>

      <Select
        label={t('p3.sector')}
        value={form.activity_sector_code}
        onChange={(e) => onSectorChange(e.target.value)}
      >
        <option value="">{t('p1.select')}</option>
        {sectors.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </Select>

      <Select
        label={t('p3.subsector')}
        value={form.activity_subsector_code}
        onChange={(e) => onSubsectorChange(e.target.value)}
        disabled={!form.activity_sector_code}
      >
        <option value="">
          {form.activity_sector_code ? t('p1.select') : t('p3.subsector_hint')}
        </option>
        {subsectors.map((s) => (
          <option key={s.code} value={s.code}>
            {s.label}
          </option>
        ))}
      </Select>

      <Select
        label={t('p3.income')}
        value={form.income_range}
        onChange={(e) => setField('income_range', e.target.value)}
      >
        <option value="">{t('p1.select')}</option>
        {INCOME_RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {optionLabel(o, lang)}
          </option>
        ))}
      </Select>

      <Input
        label={`${t('p3.rib')} ${t('p1.optional')}`}
        value={form.rib}
        onChange={(e) => setField('rib', e.target.value)}
        placeholder="Ex : 10001 00001 12345678901 97"
      />
    </div>
  )
}
