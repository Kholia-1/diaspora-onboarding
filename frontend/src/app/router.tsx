import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RequireAuth, RequireRole } from './guards'
import { BackofficeShell } from '../components/layout/BackofficeShell'
import { LoginPage } from '../pages/backoffice/LoginPage'
import { ApplicationsListPage } from '../pages/backoffice/ApplicationsListPage'
import { ApplicationDetailPage } from '../pages/backoffice/ApplicationDetailPage'
import { UsersPage } from '../pages/backoffice/UsersPage'
import { AgenciesPage } from '../pages/backoffice/AgenciesPage'
import { NationalitiesPage } from '../pages/backoffice/NationalitiesPage'
import { CountriesPage } from '../pages/backoffice/CountriesPage'
import { AuditLogsPage } from '../pages/backoffice/AuditLogsPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <BackofficeShell />,
        children: [
          { path: '/', element: <Navigate to="/backoffice/applications" replace /> },
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
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/backoffice/applications" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
