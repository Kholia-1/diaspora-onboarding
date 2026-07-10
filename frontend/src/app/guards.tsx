import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '../api/auth'
import type { SessionUser } from '../types'

export function useSession() {
  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 60_000,
  })
  return {
    user: (query.data?.user ?? null) as SessionUser | null,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-afriland" />
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    </div>
  )
}

/** Protège les routes du back-office : session valide requise (GET /me). */
export function RequireAuth() {
  const { user, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Restreint l'accès à un ou plusieurs rôles (ex. ADMIN). */
export function RequireRole({ roles, children }: { roles: string[]; children?: ReactNode }) {
  const { user, isLoading } = useSession()

  if (isLoading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-card">
        <p className="text-lg font-bold text-gray-900">Accès restreint</p>
        <p className="mt-2 text-sm text-gray-500">
          Cette section est réservée aux rôles : {roles.join(', ')}.
        </p>
      </div>
    )
  }
  return children ? <>{children}</> : <Outlet />
}
