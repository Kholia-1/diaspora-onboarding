import type { FormEvent } from 'react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { login } from '../../api/auth'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import logo from '../../assets/afriland-logo.png'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/backoffice/applications', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#eef0f4] via-[#e5e8ee] to-[#d6d9e1] p-4">
      {/* Halos premium subtils sur fond gris */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-white/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-afriland/8 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-white/50 blur-2xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white p-2 shadow-lg ring-1 ring-gray-100">
              <img src={logo} alt="Afriland First Bank" className="h-full w-full object-contain" />
            </span>
            <h1 className="mt-5 text-xl font-extrabold text-gray-900">Back-office Diaspora</h1>
            <p className="mt-1 text-sm text-gray-500">
              Connectez-vous pour accéder à l'espace de gestion
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Identifiant"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex. j.dupont"
            />
            <Input
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100"
              >
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          Afriland First Bank — Accès réservé au personnel habilité
        </p>
      </div>
    </div>
  )
}
