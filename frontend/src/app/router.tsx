import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RequireAuth, RequireRole } from './guards'
import { BackofficeShell } from '../components/layout/BackofficeShell'
import { ClientPortalLayout } from '../components/layout/ClientPortalLayout'
import { PortalHome } from '../pages/client/PortalHome'
import { StatusTrackingPage } from '../pages/client/StatusTrackingPage'
import { AccountOpeningPage } from '../pages/client/open-account/AccountOpeningPage'
import { LoginPage } from '../pages/backoffice/LoginPage'
import { ApplicationsListPage } from '../pages/backoffice/ApplicationsListPage'
import { ApplicationDetailPage } from '../pages/backoffice/ApplicationDetailPage'
import { UsersPage } from '../pages/backoffice/UsersPage'
import { AgenciesPage } from '../pages/backoffice/AgenciesPage'
import { NationalitiesPage } from '../pages/backoffice/NationalitiesPage'
import { CountriesPage } from '../pages/backoffice/CountriesPage'
import { AuditLogsPage } from '../pages/backoffice/AuditLogsPage'

const router = createBrowserRouter([
  // ---- Espace client public (hors shell back-office, sans authentification)
  {
    element: <ClientPortalLayout />,
    children: [
      { path: '/', element: <PortalHome /> },
      { path: '/ouvrir-un-compte', element: <AccountOpeningPage /> },
      { path: '/suivi', element: <StatusTrackingPage /> },
    ],
  },

  // ---- Back-office
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <BackofficeShell />,
        children: [
          { path: '/backoffice', element: <Navigate to="/backoffice/applications" replace /> },
          { path: '/backoffice/applications', element: <ApplicationsListPage /> },
          { path: '/backoffice/applications/:idOrReference', element: <ApplicationDetailPage /> },
          { path: '/backoffice/agencies', element: <AgenciesPage /> },
          { path: '/backoffice/nationalities', element: <NationalitiesPage /> },
          { path: '/backoffice/countries', element: <CountriesPage /> },
          {
            path: '/backoffice/users',
            element: (
              <RequireRole roles={['ADMIN']}>
                <UsersPage />
              </RequireRole>
            ),
          },
          { path: '/backoffice/audit-logs', element: <AuditLogsPage /> },
          // Route back-office inconnue → liste des dossiers
          { path: '/backoffice/*', element: <Navigate to="/backoffice/applications" replace /> },
        ],
      },
    ],
  },

  // ---- Toute autre route inconnue → portail client
  { path: '*', element: <Navigate to="/" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
