import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function PageHeader(props: {
  title: string
  description?: string
  actions?: ReactNode
  variant?: 'default' | 'subtle'
}) {
  const subtle = props.variant === 'subtle'
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-3 sm:mb-8 sm:gap-4 sm:flex-row sm:items-end sm:justify-between',
        !subtle && 'border-b border-slate-200/80 pb-5 sm:pb-6 dark:border-slate-800'
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-xl tracking-tight text-slate-900 sm:text-2xl dark:text-white">
          {props.title}
        </h1>
        {props.description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {props.description}
          </p>
        )}
      </div>
      {props.actions ? <div className="flex shrink-0 flex-wrap gap-2">{props.actions}</div> : null}
    </header>
  )
}
