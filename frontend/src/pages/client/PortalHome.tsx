import { Link } from 'react-router-dom'
import {
  LEGACY_OPEN_ACCOUNT_URL,
  useClientToast,
} from '../../components/layout/ClientPortalLayout'
import { useLang } from '../../app/i18n'

function ServiceCard({
  icon,
  title,
  description,
  available,
  availableLabel,
  soonLabel,
  action,
}: {
  icon: string
  title: string
  description: string
  available: boolean
  availableLabel: string
  soonLabel: string
  action: React.ReactNode
}) {
  return (
    <article className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-card transition-transform hover:-translate-y-0.5">
      <div>
        <div className="flex items-start justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl">
            {icon}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
              available
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {available ? availableLabel : soonLabel}
          </span>
        </div>
        <h3 className="mt-4 text-base font-extrabold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
      <div className="mt-5">{action}</div>
    </article>
  )
}

const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-afriland px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-afriland-dark'
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50'

export function PortalHome() {
  const showToast = useClientToast()
  const { t } = useLang()

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-topbar-from via-[#1c1e26] to-topbar-to p-8 text-white shadow-card sm:p-10">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-afriland/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-afriland/20 blur-3xl" />
          <div className="relative">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-gray-200 ring-1 ring-white/20">
              {t('hero.badge')}
            </span>
            <h1 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight sm:text-4xl">
              {t('hero.title.prefix')} <span className="text-red-400">{t('hero.title.accent')}</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-300">{t('hero.desc')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={LEGACY_OPEN_ACCOUNT_URL} className={primaryBtn}>
                {t('hero.open')}
              </a>
              <Link
                to="/suivi"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/20"
              >
                {t('hero.track')}
              </Link>
            </div>
          </div>
        </div>

        <aside className="flex flex-col justify-center rounded-2xl bg-white p-7 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
            {t('aside.title')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">{t('aside.desc')}</p>
          <Link to="/suivi" className={`${secondaryBtn} mt-5 self-start`}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <circle cx="9" cy="9" r="6" />
              <path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            {t('aside.link')}
          </Link>
        </aside>
      </section>

      {/* Services */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-gray-900">{t('services.title')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('services.desc')}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ServiceCard
            icon="🏦"
            title={t('card.account.title')}
            description={t('card.account.desc')}
            available
            availableLabel={t('card.available')}
            soonLabel={t('card.soon')}
            action={
              <a href={LEGACY_OPEN_ACCOUNT_URL} className={primaryBtn}>
                {t('card.account.action')}
              </a>
            }
          />
          <ServiceCard
            icon="💳"
            title={t('card.card.title')}
            description={t('card.card.desc')}
            available={false}
            availableLabel={t('card.available')}
            soonLabel={t('card.soon')}
            action={
              <button type="button" className={secondaryBtn} onClick={() => showToast(t('toast.card'))}>
                {t('card.access')}
              </button>
            }
          />
          <ServiceCard
            icon="🔁"
            title={t('card.topup.title')}
            description={t('card.topup.desc')}
            available={false}
            availableLabel={t('card.available')}
            soonLabel={t('card.soon')}
            action={
              <button type="button" className={secondaryBtn} onClick={() => showToast(t('toast.topup'))}>
                {t('card.access')}
              </button>
            }
          />
        </div>
      </section>
    </div>
  )
}
