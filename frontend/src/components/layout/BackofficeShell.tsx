import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '../../api/auth'
import { useSession } from '../../app/guards'
import { BurgerButton } from './ClientPortalLayout'
import logo from '../../assets/afriland-logo.png'

const NAV_ITEMS = [
  { to: '/backoffice/applications', label: 'Dossiers' },
  { to: '/backoffice/agencies', label: 'Agences' },
  { to: '/backoffice/nationalities', label: 'Nationalités' },
  { to: '/backoffice/countries', label: 'Pays' },
  { to: '/backoffice/users', label: 'Utilisateurs', adminOnly: true },
  { to: '/backoffice/audit-logs', label: "Journal d'audit" },
]

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path
        d="M15 12H4m0 0l3.5-3.5M4 12l3.5 3.5M10 5V4a1 1 0 011-1h8a1 1 0 011 1v16a1 1 0 01-1 1h-8a1 1 0 01-1-1v-1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BackofficeShell() {
  const { user } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      queryClient.clear()
      navigate('/login', { replace: true })
    }
  }

  const closeMenu = () => setMenuOpen(false)
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN')

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      isActive ? 'bg-afriland text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b-[3px] border-afriland bg-gradient-to-r from-topbar-from to-topbar-to shadow-lg">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-6">
          {/* Logo dans une pastille blanche */}
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow">
              <img src={logo} alt="Afriland First Bank" className="h-full w-full object-contain" />
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-extrabold tracking-wide text-white">Afriland First Bank</p>
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
                Back-office Diaspora
              </p>
            </div>
          </div>

          {/* Navigation desktop */}
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {visibleItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Profil connecté + déconnexion + hamburger */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight md:block">
              <p className="text-sm font-semibold text-white">{user?.full_name ?? user?.username}</p>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">{user?.role}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-afriland text-sm font-bold text-white">
              {(user?.full_name ?? user?.username ?? '?').charAt(0).toUpperCase()}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogoutIcon />
            </button>
            <div className="lg:hidden">
              <BurgerButton
                open={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                controls="backoffice-mobile-nav"
                dark
              />
            </div>
          </div>

          {/* Panneau mobile déroulant sous le bandeau */}
          {menuOpen && (
            <nav
              id="backoffice-mobile-nav"
              className="absolute inset-x-0 top-full z-40 flex flex-col gap-1.5 border-b-[3px] border-afriland bg-gradient-to-b from-topbar-from to-topbar-to px-4 pb-5 pt-3 shadow-2xl lg:hidden"
            >
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-3 text-center text-[15px] font-semibold transition-colors ${
                      isActive ? 'bg-afriland text-white' : 'text-gray-200 hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Clic hors du panneau mobile : fermeture */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={closeMenu} />
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
