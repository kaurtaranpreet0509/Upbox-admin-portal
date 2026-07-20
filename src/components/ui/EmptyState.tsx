import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState(props: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  const Icon = props.icon
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-600 dark:bg-slate-900',
        props.className
      )}
    >
      {Icon ? <Icon className="h-12 w-12 text-primary-300" /> : null}
      <p className={cn('text-sm font-medium text-slate-600', Icon && 'mt-4')}>{props.title}</p>
      {props.description ? <p className="mt-1 max-w-md text-xs text-slate-500">{props.description}</p> : null}
      {props.action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{props.action}</div> : null}
    </div>
  )
}
