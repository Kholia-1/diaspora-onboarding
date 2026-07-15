import { useQuery } from '@tanstack/react-query'
import { agenciesApi, countriesApi } from '../../api/referentials'
import { ReferentialCrudPage } from '../../components/referential/ReferentialCrudPage'
import type { Agency } from '../../types'

export function AgenciesPage() {
  // Pays de rattachement : sélecteur du formulaire, libellé de colonne et filtre de liste.
  const { data: countries = [] } = useQuery({ queryKey: ['countries'], queryFn: countriesApi.list })
  const countryOptions = countries.map((c) => ({ value: String(c.id), label: c.name_fr }))
  const countryById = new Map(countries.map((c) => [c.id, c.name_fr]))

  return (
    <ReferentialCrudPage<Agency>
      title="Agences"
      subtitle="Référentiel des agences Afriland First Bank"
      queryKey="agencies"
      api={agenciesApi}
      itemLabel={(a) => `${a.code} — ${a.name}`}
      fields={[
        { name: 'code', label: 'Code', required: true, placeholder: 'ex. AG001' },
        { name: 'name', label: 'Nom', required: true },
        { name: 'city', label: 'Ville' },
        { name: 'country_id', label: 'Pays', type: 'select', numeric: true, options: countryOptions },
      ]}
      columns={[
        {
          header: 'Code',
          render: (a) => <span className="font-mono text-xs font-semibold">{a.code}</span>,
        },
        { header: 'Nom', render: (a) => <span className="font-semibold text-gray-900">{a.name}</span> },
        { header: 'Ville', render: (a) => a.city ?? '—' },
        {
          header: 'Pays',
          render: (a) =>
            (a.country_id != null ? countryById.get(a.country_id) : null) ?? a.country ?? '—',
        },
      ]}
      filter={{
        label: 'Filtrer par pays',
        options: countryOptions,
        predicate: (a, value) => String(a.country_id ?? '') === value,
      }}
    />
  )
}
