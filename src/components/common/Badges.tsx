import type { CartonStatus, ZoneType } from '@/types/inbound'
import { ZONE_LABELS } from '@/types/inbound'
import { cn } from '@/lib/cn'

const CARTON_TONES: Record<CartonStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-800 ring-slate-200',
  RECEIVED: 'bg-amber-50 text-amber-950 ring-amber-200',
  ASSIGNED: 'bg-sky-50 text-sky-900 ring-sky-200',
  OPENED: 'bg-indigo-50 text-indigo-900 ring-indigo-200',
  PUTAWAY_IN_PROGRESS: 'bg-violet-50 text-violet-900 ring-violet-200',
  COMPLETE: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
}

const ZONE_TONES: Record<ZoneType, string> = {
  goods_in: 'bg-amber-500 text-white',
  pick: 'bg-emerald-500 text-white',
  inspection: 'bg-violet-700 text-white',
}

export function CartonStatusBadge({ status }: { status: CartonStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1', CARTON_TONES[status])}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  )
}

export function ZoneTypeBadge({ zone }: { zone: ZoneType }) {
  return (
    <span className={cn('inline-flex rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', ZONE_TONES[zone])}>
      {ZONE_LABELS[zone]}
    </span>
  )
}

export function CapacityFillPill({ percent }: { percent: number }) {
  return (
    <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
      {percent.toFixed(2)}%
    </span>
  )
}
