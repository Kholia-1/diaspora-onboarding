import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary:
    'bg-afriland text-white hover:bg-afriland-dark focus-visible:outline-afriland shadow-sm',
  secondary:
    'bg-white text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-gray-400',
  ghost: 'text-gray-600 hover:bg-gray-100 focus-visible:outline-gray-400',
  danger:
    'bg-white text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50 focus-visible:outline-red-400',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizing = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
