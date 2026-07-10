import { countriesApi } from '../../api/referentials'
import { ReferentialCrudPage } from '../../components/referential/ReferentialCrudPage'
import type { Country } from '../../types'

export function CountriesPage() {
  return (
    <ReferentialCrudPage<Country>
      title="Pays"
      subtitle="Référentiel des pays de résidence (indicatifs téléphoniques)"
      queryKey="countries"
      api={countriesApi}
      itemLabel={(c) => c.name_fr}
      fields={[
        { name: 'iso_code', label: 'Code ISO', required: true, placeholder: 'ex. FR' },
        { name: 'flag', label: 'Drapeau (emoji)', placeholder: 'ex. 🇫🇷' },
        { name: 'name_fr', label: 'Nom (français)', required: true },
        { name: 'calling_code', label: 'Indicatif téléphonique', placeholder: 'ex. +33' },
        { name: 'display_order', label: "Ordre d'affichage", type: 'number' },
      ]}
      columns={[
        { header: 'Drapeau', render: (c) => <span className="text-lg">{c.flag ?? '—'}</span> },
        {
          header: 'Code ISO',
          render: (c) => <span className="font-mono text-xs font-semibold">{c.iso_code}</span>,
        },
        {
          header: 'Nom',
          render: (c) => <span className="font-semibold text-gray-900">{c.name_fr}</span>,
        },
        { header: 'Indicatif', render: (c) => c.calling_code ?? '—' },
        { header: 'Ordre', render: (c) => c.display_order ?? '—' },
      ]}
    />
  )
}
