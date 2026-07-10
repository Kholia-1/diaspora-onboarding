import type { ReactNode } from 'react'

export type BadgeTone = 'green' | 'orange' | 'red' | 'blue' | 'gray'

const tones: Record<BadgeTone, string> = {
  green: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  orange: 'bg-amber-100 text-amber-800 ring-amber-200',
  red: 'bg-red-100 text-red-800 ring-red-200',
  blue: 'bg-blue-100 text-blue-800 ring-blue-200',
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
}

export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Dossier soumis',
  AUTO_KYC_OK: 'KYC automatique validé',
  AUTO_KYC_REVIEW: 'KYC en revue',
  BLACKMODULE_ALERT: 'Alerte conformité',
  COMPLIANCE_REVIEW: 'Revue conformité',
  APPROVED: 'Dossier approuvé',
  REJECTED: 'Dossier rejeté',
  NEED_MORE_DOCUMENTS: 'Complément demandé',
  ACCOUNT_OPENED: 'Compte ouvert',
}

const STATUS_TONES: Record<string, BadgeTone> = {
  SUBMITTED: 'blue',
  AUTO_KYC_OK: 'green',
  AUTO_KYC_REVIEW: 'orange',
  BLACKMODULE_ALERT: 'red',
  COMPLIANCE_REVIEW: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  NEED_MORE_DOCUMENTS: 'orange',
  ACCOUNT_OPENED: 'green',
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return STATUS_LABELS[status] ?? status
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="gray">—</Badge>
  return <Badge tone={STATUS_TONES[status] ?? 'gray'}>{statusLabel(status)}</Badge>
}
