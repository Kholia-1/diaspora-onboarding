import type { ReactNode, HTMLAttributes } from 'react'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-gray-100">
      <table className="min-w-full divide-y divide-gray-100 text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-gray-50">
      <tr>{children}</tr>
    </thead>
  )
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 ${className}`}
    >
      {children}
    </th>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
}

interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean
}

export function Tr({ clickable = false, className = '', ...props }: TrProps) {
  return (
    <tr
      className={`${clickable ? 'cursor-pointer transition-colors hover:bg-red-50/40' : ''} ${className}`}
      {...props}
    />
  )
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-middle text-gray-700 ${className}`}>{children}</td>
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-gray-400">
        {message}
      </td>
    </tr>
  )
}
