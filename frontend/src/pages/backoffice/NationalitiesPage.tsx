import { nationalitiesApi } from '../../api/referentials'
import { ReferentialCrudPage } from '../../components/referential/ReferentialCrudPage'
import type { Nationality } from '../../types'

export function NationalitiesPage() {
  return (
    <ReferentialCrudPage<Nationality>
      title="Nationalités"
      subtitle="Référentiel des nationalités proposées à l'ouverture de compte"
      queryKey="nationalities"
      api={nationalitiesApi}
      itemLabel={(n) => n.label}
      fields={[
        { name: 'code', label: 'Code', required: true, placeholder: 'ex. CM' },
        { name: 'label', label: 'Libellé', required: true, placeholder: 'ex. Camerounaise' },
      ]}
      columns={[
        {
          header: 'Code',
          render: (n) => <span className="font-mono text-xs font-semibold">{n.code}</span>,
        },
        {
          header: 'Libellé',
          render: (n) => <span className="font-semibold text-gray-900">{n.label}</span>,
        },
      ]}
    />
  )
}
