import type { IncomingOrderStatus, StockHealth, ZoneType } from '@/types/inventory'
import { HEALTH_LABELS, ZONE_LABELS } from '@/types/inventory'
import { cn } from '@/lib/cn'

const HEALTH_TONES: Record<StockHealth, string> = {
  healthy: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  low: 'bg-amber-50 text-amber-900 ring-amber-200',
  critical: 'bg-orange-50 text-orange-950 ring-orange-200',
  out: 'bg-rose-50 text-rose-900 ring-rose-200',
  incoming_only: 'bg-sky-50 text-sky-900 ring-sky-200',
}

const ZONE_TONES: Record<ZoneType, string> = {
  goods_in: 'bg-amber-500 text-white',
  pick: 'bg-emerald-500 text-white',
  inspection: 'bg-violet-700 text-white',
}

const ORDER_TONES: Record<IncomingOrderStatus, string> = {
  expected: 'bg-slate-100 text-slate-800 ring-slate-200',
  in_transit: 'bg-sky-50 text-sky-900 ring-sky-200',
  at_dock: 'bg-amber-50 text-amber-950 ring-amber-200',
  receiving: 'bg-indigo-50 text-indigo-900 ring-indigo-200',
  partial: 'bg-violet-50 text-violet-900 ring-violet-200',
}

export function HealthBadge({ health }: { health: StockHealth }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1', HEALTH_TONES[health])}>
      {HEALTH_LABELS[health]}
    </span>
  )
}

export function ZoneBadge({ zone }: { zone: ZoneType }) {
  return (
    <span className={cn('inline-flex rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide', ZONE_TONES[zone])}>
      {ZONE_LABELS[zone]}
    </span>
  )
}

export function OrderStatusBadge({ status }: { status: IncomingOrderStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ring-1', ORDER_TONES[status])}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}

export function SourceBadge({ source }: { source: string }) {
  const label =
    source === 'both' ? 'Seller + Inbound' : source === 'seller_portal' ? 'Seller portal' : 'Inbound'
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
      {label}
    </span>
  )
}
