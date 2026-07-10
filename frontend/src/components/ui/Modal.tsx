import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">{footer}</footer>
        )}
      </div>
    </div>
  )
}
