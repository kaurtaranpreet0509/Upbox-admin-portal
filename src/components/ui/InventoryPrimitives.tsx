import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function InventoryPageHeader(props: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
      <div className="min-w-0">
        <h1 className="font-heading text-xl tracking-tight text-slate-900 sm:text-2xl">{props.title}</h1>
        {props.description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{props.description}</p>
        ) : null}
      </div>
      {props.actions ? <div className="flex shrink-0 flex-wrap gap-2">{props.actions}</div> : null}
    </header>
  )
}

export function LoadingPanel({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      <p className="text-sm font-semibold text-slate-800">{label}</p>
    </div>
  )
}

export function InventoryEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description ? <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p> : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string | number
  sub?: string
  tone?: 'default' | 'warn' | 'danger' | 'ok'
}) {
  return (
    <div
      className={cn(
        'surface-card p-4',
        tone === 'warn' && 'border-amber-200 bg-amber-50/40',
        tone === 'danger' && 'border-rose-200 bg-rose-50/40',
        tone === 'ok' && 'border-emerald-200 bg-emerald-50/40'
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-heading text-2xl text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  )
}

/** Aliases matching original inventory imports */
export {
  InventoryPageHeader as PageHeader,
  InventoryEmptyState as EmptyState,
}
