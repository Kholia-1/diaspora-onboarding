import type { ReactNode } from 'react'

export function Card({
  title,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl bg-white shadow-card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          {title && <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-6">{children}</div>
    </section>
  )
}

export function StatCard({
  label,
  value,
  accent = 'bg-gray-100 text-gray-700',
  icon,
}: {
  label: string
  value: ReactNode
  accent?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card">
      {icon && (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-2xl font-extrabold tabular-nums text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
    </div>
  )
}
