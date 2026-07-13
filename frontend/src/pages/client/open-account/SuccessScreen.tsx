import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useOaText } from './oaText'

export function SuccessScreen({
  reference,
  failedDocs,
  onRetryDocs,
  retrying,
}: {
  reference: string
  failedDocs: string[]
  onRetryDocs: () => void
  retrying: boolean
}) {
  const { t } = useOaText()

  return (
    <div className="mx-auto max-w-lg py-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
        ✓
      </div>
      <h2 className="mt-5 text-2xl font-extrabold text-gray-900">{t('ok.title')}</h2>
      <p className="mt-2 text-sm text-gray-500">{t('ok.desc')}</p>

      <div className="mx-auto mt-6 max-w-xs rounded-2xl bg-white p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t('ok.reference')}
        </p>
        <p className="mt-1 font-mono text-lg font-extrabold text-afriland">{reference}</p>
      </div>

      {failedDocs.length > 0 && (
        <div className="mx-auto mt-5 max-w-md rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
          <p>
            {t('ok.docs_partial')}
            {failedDocs.join(', ')}
          </p>
          <Button variant="warning" size="sm" className="mt-3" onClick={onRetryDocs} disabled={retrying}>
            {retrying ? t('nav.submitting') : t('ok.docs_retry')}
          </Button>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/suivi"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-afriland px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-afriland-dark"
        >
          {t('ok.track')}
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50"
        >
          {t('ok.home')}
        </Link>
      </div>
    </div>
  )
}
