import { createContext, useCallback, useContext, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// i18n légère FR/EN pour les pages client publiques (parité avec le sélecteur
// de langue du parcours legacy). Le back-office reste en français.
// ---------------------------------------------------------------------------

export type Lang = 'fr' | 'en'

const STORAGE_KEY = 'client_lang'

const MESSAGES: Record<Lang, Record<string, string>> = {
  fr: {
    'brand.title': "Portail d'onboarding client",
    'brand.sub': 'Services bancaires digitaux à distance',
    'nav.home': 'Accueil',
    'nav.open_account': 'Ouverture de compte',
    'nav.card': 'Carte bancaire',
    'nav.topup': 'Recharge de carte',
    'nav.track': 'Suivre ma demande',
    'footer.copyright': '© Afriland First Bank — Portail digital client',
    'footer.evolving': "Service digital en cours d'évolution",
    'toast.card': 'Carte bancaire — Ce service sera disponible prochainement.',
    'toast.topup': 'Recharge de carte — Ce service sera disponible prochainement.',

    'hero.badge': 'Services bancaires en ligne',
    'hero.title.prefix': 'Comment pouvons-nous',
    'hero.title.accent': 'vous accompagner ?',
    'hero.desc':
      'Sélectionnez le service bancaire souhaité : ouverture de compte à distance, services carte, ou suivi de votre demande en cours.',
    'hero.open': 'Ouvrir un compte',
    'hero.track': 'Suivre ma demande',
    'aside.title': 'Espace client',
    'aside.desc':
      'Retrouvez ici les principaux services disponibles pour préparer une demande, accéder à un service bancaire ou suivre les prochaines évolutions.',
    'aside.link': "Consulter l'état de mon dossier",
    'services.title': 'Services disponibles',
    'services.desc': 'Choisissez le service qui correspond à votre besoin.',
    'card.available': 'Disponible',
    'card.soon': 'Bientôt disponible',
    'card.access': 'Accéder',
    'card.account.title': 'Démarrer une ouverture de compte à distance',
    'card.account.desc':
      "Préparez une demande d'ouverture de compte à distance avec les informations et documents nécessaires.",
    'card.account.action': 'Créer un compte',
    'card.card.title': 'Souscrire à une carte bancaire',
    'card.card.desc':
      'Accédez prochainement à la souscription de carte bancaire selon les offres et conditions de la banque.',
    'card.topup.title': 'Recharger ma carte',
    'card.topup.desc':
      'Rechargez prochainement votre carte via les canaux autorisés par la banque.',

    'track.title': 'Suivre ma demande',
    'track.desc':
      "Saisissez l'email ou le numéro de téléphone utilisé lors de votre demande d'ouverture de compte pour consulter l'avancement de votre dossier.",
    'track.placeholder': 'Email ou numéro de téléphone',
    'track.search': 'Rechercher',
    'track.searching': 'Recherche…',
    'track.error.generic': 'Recherche impossible. Réessayez plus tard.',
    'track.found': '{count} dossier(s) trouvé(s) pour « {id} »',
    'track.agency': 'Agence',
    'track.kyc': 'Score KYC',
    'track.docscore': 'Score documentaire',
    'track.not_provided': 'Non renseignée',
    'track.detail.show': 'Voir le détail',
    'track.detail.hide': 'Masquer le détail',
    'track.progress': 'Avancement de votre dossier',
    'track.bank_message': 'Message de la banque',
    'track.account_info': 'Informations de compte',
    'track.account_number': 'Numéro de compte',
    'track.rib': 'RIB',
    'track.opened_at': 'Ouvert le',
    'track.account_unavailable': 'Informations de compte indisponibles pour le moment.',
    'step.1.title': 'Dossier soumis',
    'step.1.text': 'Votre demande a été enregistrée dans le système.',
    'step.2.title': 'Analyse KYC et documents',
    'step.2.text': 'Les informations client et les pièces transmises sont en cours de contrôle.',
    'step.3.title': 'Revue conformité',
    'step.3.text':
      'Le dossier peut être validé automatiquement ou transmis à la conformité si nécessaire.',
    'step.4.title': 'Décision banque',
    'step.4.text': 'Un agent analyse le dossier et prend une décision back-office.',
    'step.5.title': 'Compte ouvert',
    'step.5.text':
      'Lorsque le compte est ouvert, les informations finales sont communiquées au client.',
  },
  en: {
    'brand.title': 'Client onboarding portal',
    'brand.sub': 'Remote digital banking services',
    'nav.home': 'Home',
    'nav.open_account': 'Account opening',
    'nav.card': 'Bank card',
    'nav.topup': 'Top-up',
    'nav.track': 'Track my request',
    'footer.copyright': '© Afriland First Bank — Digital client portal',
    'footer.evolving': 'Digital service under continuous improvement',
    'toast.card': 'Bank card — This service will be available soon.',
    'toast.topup': 'Card top-up — This service will be available soon.',

    'hero.badge': 'Online banking services',
    'hero.title.prefix': 'How can we',
    'hero.title.accent': 'help you today?',
    'hero.desc':
      'Choose the banking service you need: remote account opening, card services, or tracking of your ongoing request.',
    'hero.open': 'Open an account',
    'hero.track': 'Track my request',
    'aside.title': 'Client area',
    'aside.desc':
      'Find here the main services available to prepare a request, access a banking service or follow upcoming releases.',
    'aside.link': 'Check my application status',
    'services.title': 'Available services',
    'services.desc': 'Choose the service that fits your need.',
    'card.available': 'Available',
    'card.soon': 'Coming soon',
    'card.access': 'Access',
    'card.account.title': 'Start a remote account opening',
    'card.account.desc':
      'Prepare a remote account opening request with the required information and documents.',
    'card.account.action': 'Create an account',
    'card.card.title': 'Subscribe to a bank card',
    'card.card.desc':
      'Soon you will be able to subscribe to a bank card according to the bank offers and conditions.',
    'card.topup.title': 'Top up my card',
    'card.topup.desc': 'Soon you will be able to top up your card via authorized channels.',

    'track.title': 'Track my request',
    'track.desc':
      'Enter the email or phone number used for your account opening request to check the progress of your application.',
    'track.placeholder': 'Email or phone number',
    'track.search': 'Search',
    'track.searching': 'Searching…',
    'track.error.generic': 'Search unavailable. Please try again later.',
    'track.found': '{count} application(s) found for “{id}”',
    'track.agency': 'Branch',
    'track.kyc': 'KYC score',
    'track.docscore': 'Document score',
    'track.not_provided': 'Not provided',
    'track.detail.show': 'View details',
    'track.detail.hide': 'Hide details',
    'track.progress': 'Application progress',
    'track.bank_message': 'Message from the bank',
    'track.account_info': 'Account information',
    'track.account_number': 'Account number',
    'track.rib': 'RIB',
    'track.opened_at': 'Opened on',
    'track.account_unavailable': 'Account information unavailable at the moment.',
    'step.1.title': 'Application submitted',
    'step.1.text': 'Your request has been registered in the system.',
    'step.2.title': 'KYC and document analysis',
    'step.2.text': 'Client information and submitted documents are being checked.',
    'step.3.title': 'Compliance review',
    'step.3.text':
      'The application can be validated automatically or forwarded to compliance if needed.',
    'step.4.title': 'Bank decision',
    'step.4.text': 'An agent reviews the application and makes a back-office decision.',
    'step.5.title': 'Account opened',
    'step.5.text': 'Once the account is opened, the final information is shared with the client.',
  },
}

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void; t: TranslateFn }>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
})

function readStoredLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* stockage indisponible : la langue reste valable pour la session */
    }
  }, [])

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      let text = MESSAGES[lang][key] ?? MESSAGES.fr[key] ?? key
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value))
        }
      }
      return text
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

/** Sélecteur FR/EN en pastille (pastille rouge = langue active). */
export function LangSwitcher() {
  const { lang, setLang } = useLang()

  const btn = (code: Lang) =>
    `flex h-10 min-w-[42px] items-center justify-center rounded-full px-3 text-sm font-extrabold tracking-wide transition-colors ${
      lang === code
        ? 'bg-afriland text-white shadow-md'
        : 'text-gray-700 hover:bg-white hover:text-afriland'
    }`

  return (
    <div
      role="group"
      aria-label="Choix de la langue"
      className="flex items-center gap-1 rounded-full bg-gray-100 p-1 ring-1 ring-gray-200"
    >
      <button type="button" onClick={() => setLang('fr')} className={btn('fr')} aria-pressed={lang === 'fr'}>
        FR
      </button>
      <button type="button" onClick={() => setLang('en')} className={btn('en')} aria-pressed={lang === 'en'}>
        EN
      </button>
    </div>
  )
}
