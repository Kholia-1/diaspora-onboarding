import { useQuery } from '@tanstack/react-query'
import { fetchActiveCountries, fetchActiveNationalities } from '../../../api/onboarding'
import { Input, Select } from '../../../components/ui/Input'
import {
  ID_TYPE_OPTIONS,
  MARITAL_OPTIONS,
  RESIDENCY_OPTIONS,
  SEX_OPTIONS,
  optionLabel,
} from './constants'
import { useOaText } from './oaText'
import type { useAccountOpeningForm } from './useAccountOpeningForm'

type Ctl = ReturnType<typeof useAccountOpeningForm>

export function Step1PersonalInfo({ ctl }: { ctl: Ctl }) {
  const { t, lang } = useOaText()
  const { form, setField } = ctl

  const { data: nationalities = [] } = useQuery({
    queryKey: ['ref', 'nationalities', 'active'],
    queryFn: fetchActiveNationalities,
    staleTime: 5 * 60_000,
  })
  const { data: countries = [] } = useQuery({
    queryKey: ['ref', 'countries', 'active'],
    queryFn: fetchActiveCountries,
    staleTime: 5 * 60_000,
  })

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-gray-600 ring-1 ring-inset ring-red-100">
        {t('p1.prefill_note')}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={t('p1.identity_type')}
          value={form.identity_type}
          onChange={(e) => setField('identity_type', e.target.value)}
        >
          <option value="">{t('p1.select')}</option>
          {ID_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {optionLabel(o, lang)}
            </option>
          ))}
        </Select>

        <Select
          label={t('p1.residency_status')}
          value={form.residency_status}
          onChange={(e) => setField('residency_status', e.target.value)}
        >
          {RESIDENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {optionLabel(o, lang)}
            </option>
          ))}
        </Select>

        <Input
          label={t('p1.last_name')}
          value={form.last_name}
          onChange={(e) => setField('last_name', e.target.value)}
          required
        />
        <Input
          label={t('p1.first_name')}
          value={form.first_name}
          onChange={(e) => setField('first_name', e.target.value)}
          required
        />

        <Select
          label={t('p1.sex')}
          value={form.sex}
          onChange={(e) => setField('sex', e.target.value)}
        >
          <option value="">{t('p1.select')}</option>
          {SEX_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {optionLabel(o, lang)}
            </option>
          ))}
        </Select>
        <Select
          label={t('p1.marital')}
          value={form.marital_status}
          onChange={(e) => setField('marital_status', e.target.value)}
        >
          <option value="">{t('p1.select')}</option>
          {MARITAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {optionLabel(o, lang)}
            </option>
          ))}
        </Select>

        <Input
          label={t('p1.birth_date')}
          type="date"
          value={form.birth_date}
          onChange={(e) => setField('birth_date', e.target.value)}
        />
        <Input
          label={t('p1.birth_place')}
          value={form.birth_place}
          onChange={(e) => setField('birth_place', e.target.value)}
        />

        <Select
          label={t('p1.nationality')}
          value={form.nationality}
          onChange={(e) => setField('nationality', e.target.value)}
        >
          <option value="">{t('p1.select')}</option>
          {nationalities.map((n) => (
            <option key={n.id} value={n.label}>
              {n.label}
            </option>
          ))}
        </Select>
        <Select
          label={t('p1.residence')}
          value={form.residence}
          onChange={(e) => setField('residence', e.target.value)}
        >
          <option value="">{t('p1.select')}</option>
          {countries.map((c) => (
            <option key={c.id} value={c.name_fr}>
              {c.flag ? `${c.flag} ` : ''}
              {c.name_fr}
            </option>
          ))}
        </Select>

        <Input
          label={t('p1.email')}
          type="email"
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
          required
        />
        <Input
          label={t('p1.phone')}
          value={form.phone}
          onChange={(e) => setField('phone', e.target.value)}
          placeholder="+237 6XX XXX XXX"
        />

        <Input
          label={`${t('p1.id_number')} ${t('p1.optional')}`}
          value={form.identity_document_number}
          onChange={(e) => setField('identity_document_number', e.target.value)}
        />
        <Input
          label={`${t('p1.address')} ${t('p1.optional')}`}
          value={form.address_location}
          onChange={(e) => setField('address_location', e.target.value)}
        />
      </div>
    </div>
  )
}
