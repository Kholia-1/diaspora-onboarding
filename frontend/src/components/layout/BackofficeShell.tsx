import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '../../api/auth'
import { useSession } from '../../app/guards'
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

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      queryClient.clear()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b-[3px] border-afriland bg-gradient-to-r from-topbar-from to-topbar-to shadow-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          {/* Logo dans une pastille blanche */}
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white p-1.5 shadow">
              <img src={logo} alt="Afriland First Bank" className="h-full w-full object-contain" />
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-extrabold tracking-wide text-white">Afriland First Bank</p>
              <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
                Back-office Diaspora
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN').map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-afriland text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Profil connecté + déconnexion */}
          <div className="flex items-center gap-3">
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
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
