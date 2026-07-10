import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

const fieldClasses =
  'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-afriland focus:outline-none focus:ring-2 focus:ring-afriland/20 disabled:bg-gray-50 disabled:text-gray-400'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const input = <input id={inputId} className={`${fieldClasses} ${className}`} {...props} />
  if (!label) return input
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-xs font-semibold text-gray-600">
        {label}
      </label>
      {input}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: ReactNode
}

export function Select({ label, id, className = '', children, ...props }: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const select = (
    <select id={selectId} className={`${fieldClasses} ${className}`} {...props}>
      {children}
    </select>
  )
  if (!label) return select
  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-xs font-semibold text-gray-600">
        {label}
      </label>
      {select}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-afriland' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4.5' : 'left-0.5'}`}
        />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}
