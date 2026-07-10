import { agenciesApi } from '../../api/referentials'
import { ReferentialCrudPage } from '../../components/referential/ReferentialCrudPage'
import type { Agency } from '../../types'

export function AgenciesPage() {
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
        { name: 'country', label: 'Pays' },
      ]}
      columns={[
        {
          header: 'Code',
          render: (a) => <span className="font-mono text-xs font-semibold">{a.code}</span>,
        },
        { header: 'Nom', render: (a) => <span className="font-semibold text-gray-900">{a.name}</span> },
        { header: 'Ville', render: (a) => a.city ?? '—' },
        { header: 'Pays', render: (a) => a.country ?? '—' },
      ]}
    />
  )
}
