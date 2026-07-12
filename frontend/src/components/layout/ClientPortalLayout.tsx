import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LangProvider, LangSwitcher, useLang } from '../../app/i18n'
import logo from '../../assets/afriland-logo.png'

export const LEGACY_OPEN_ACCOUNT_URL = 'http://localhost:8010/open-account-flow-test'

// ---------------------------------------------------------------------------
// Toast « bientôt disponible » partagé par le layout et les pages publiques.
// ---------------------------------------------------------------------------

const ToastContext = createContext<(message: string) => void>(() => {})

export function useClientToast() {
  return useContext(ToastContext)
}

const pillBase =
  'whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-colors'
const pillIdle = 'text-gray-800 hover:bg-red-50 hover:text-afriland'
const pillActive = 'bg-afriland text-white shadow-sm'

/** Bouton hamburger : 3 barres qui se transforment en croix quand le menu est ouvert. */
export function BurgerButton({
  open,
  onClick,
  controls,
  dark = false,
}: {
  open: boolean
  onClick: () => void
  controls: string
  dark?: boolean
}) {
  const bar = `block h-[3px] w-[22px] rounded-full transition-transform duration-200 ${
    dark ? 'bg-white' : 'bg-afriland'
  }`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
      className={`flex flex-col items-center justify-center gap-[4px] rounded-xl border p-2.5 ${
        dark
          ? 'border-white/30 bg-white/5 hover:bg-white/10'
          : 'border-red-200 bg-white hover:bg-red-50'
      }`}
    >
      <span className={`${bar} ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
      <span className={`${bar} ${open ? 'opacity-0' : ''} transition-opacity`} />
      <span className={`${bar} ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
    </button>
  )
}

export function ClientPortalLayout() {
  return (
    <LangProvider>
      <ClientPortalLayoutInner />
    </LangProvider>
  )
}

function ClientPortalLayoutInner() {
  const { t } = useLang()
  const [toast, setToast] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const timerRef = useRef<number | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setToast(null), 4200)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  const navLinks = (
    <>
      <NavLink
        to="/"
        end
        onClick={closeMenu}
        className={({ isActive }) => `${pillBase} ${isActive ? pillActive : pillIdle}`}
      >
        {t('nav.home')}
      </NavLink>
      <a href={LEGACY_OPEN_ACCOUNT_URL} className={`${pillBase} ${pillIdle}`}>
        {t('nav.open_account')}
      </a>
      <button
        type="button"
        onClick={() => {
          closeMenu()
          showToast(t('toast.card'))
        }}
        className={`${pillBase} ${pillIdle}`}
      >
        {t('nav.card')}
      </button>
      <button
        type="button"
        onClick={() => {
          closeMenu()
          showToast(t('toast.topup'))
        }}
        className={`${pillBase} ${pillIdle}`}
      >
        {t('nav.topup')}
      </button>
      <NavLink
        to="/suivi"
        onClick={closeMenu}
        className={({ isActive }) => `${pillBase} ${isActive ? pillActive : pillIdle}`}
      >
        {t('nav.track')}
      </NavLink>
    </>
  )

  return (
    <ToastContext.Provider value={showToast}>
      <div className="flex min-h-screen flex-col bg-surface">
        {/* Header clair : logo + menu pastilles (hamburger en mobile) */}
        <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 shadow-soft backdrop-blur">
          <div className="relative mx-auto flex max-w-6xl items-center gap-x-4 px-4 py-3 sm:px-6">
            <NavLink to="/" className="flex min-w-0 items-center gap-3" onClick={closeMenu}>
              {/* Le logo contient déjà l'icône + « Afriland First Bank » : on l'affiche
                  à sa largeur naturelle, sans pastille qui le recadrerait. */}
              <img
                src={logo}
                alt="Afriland First Bank"
                className="h-9 w-auto shrink-0 object-contain sm:h-10"
              />
              {/* Titre : uniquement sur écran large (le logo suffit en mobile). */}
              <span className="hidden min-w-0 leading-tight lg:block">
                <span className="block truncate text-base font-extrabold text-afriland">
                  {t('brand.title')}
                </span>
                <span className="block truncate text-xs font-medium text-gray-500">
                  {t('brand.sub')}
                </span>
              </span>
            </NavLink>

            {/* Menu desktop */}
            <nav
              aria-label="Menu des services"
              className="hidden flex-1 items-center justify-center gap-1 md:flex"
            >
              {navLinks}
            </nav>

            {/* Sélecteur de langue + hamburger (le burger n'apparaît qu'en mobile) */}
            <div className="ml-auto flex items-center gap-2 md:ml-3">
              <LangSwitcher />
              <div className="md:hidden">
                <BurgerButton
                  open={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                  controls="client-mobile-nav"
                />
              </div>
            </div>

            {/* Panneau mobile déroulant sous le header */}
            {menuOpen && (
              <nav
                id="client-mobile-nav"
                aria-label="Menu des services"
                className="absolute inset-x-0 top-full z-40 flex flex-col items-stretch gap-2 border-b border-gray-200 bg-white px-4 pb-5 pt-3 text-center shadow-2xl md:hidden [&>*]:justify-center [&>a]:block [&>button]:block"
              >
                {navLinks}
              </nav>
            )}
          </div>
          <div className="h-[3px] bg-gradient-to-r from-afriland via-afriland-dark to-afriland" />
        </header>

        {/* Clic hors du panneau mobile : fermeture */}
        {menuOpen && (
          <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={closeMenu} />
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Outlet />
        </main>

        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>{t('footer.copyright')}</span>
            <span>{t('footer.evolving')}</span>
          </div>
        </footer>

        {/* Toast */}
        {toast && (
          <div
            role="status"
            className="fixed bottom-6 left-1/2 z-50 w-[min(90vw,26rem)] -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-4 text-sm font-medium text-white shadow-2xl"
          >
            {toast}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
