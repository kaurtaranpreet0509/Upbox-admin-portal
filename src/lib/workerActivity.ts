import type {
  WarehouseWorker,
  WorkActivityEvent,
  WorkEventKind,
  WorkerRole,
  WorkerWorkStats,
  WorkPeriod,
} from '@/types/inbound'

export function emptyStats(): WorkerWorkStats {
  return {
    cartonsReceived: 0,
    productsStaged: 0,
    productsDamaged: 0,
    productsAssigned: 0,
    productsPlaced: 0,
    cartonsCompleted: 0,
  }
}

export function periodStart(period: WorkPeriod, now = new Date()): Date {
  const d = new Date(now)
  if (period === 'today') {
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'week') {
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function filterActivityByPeriod(
  activity: WorkActivityEvent[],
  period: WorkPeriod,
  now = new Date()
): WorkActivityEvent[] {
  const start = periodStart(period, now).getTime()
  const end = now.getTime()
  return activity.filter((e) => {
    const t = new Date(e.at).getTime()
    return t >= start && t <= end
  })
}

export function summarizeActivity(activity: WorkActivityEvent[]): WorkerWorkStats & {
  lastAt: string | null
  firstAt: string | null
  eventCount: number
} {
  const stats = emptyStats()
  let lastAt: string | null = null
  let firstAt: string | null = null
  for (const e of activity) {
    if (e.kind === 'carton_received') stats.cartonsReceived += 1
    if (e.kind === 'product_staged') stats.productsStaged += 1
    if (e.kind === 'product_damaged') stats.productsDamaged += 1
    if (e.kind === 'products_assigned') stats.productsAssigned += 1
    if (e.kind === 'product_placed') stats.productsPlaced += 1
    if (e.kind === 'carton_completed') stats.cartonsCompleted += 1
    if (!lastAt || e.at > lastAt) lastAt = e.at
    if (!firstAt || e.at < firstAt) firstAt = e.at
  }
  return { ...stats, lastAt, firstAt, eventCount: activity.length }
}

export function workerActivitySummary(
  w: WarehouseWorker,
  period: WorkPeriod = 'today'
): { label: string; qty: number } {
  const stats = summarizeActivity(filterActivityByPeriod(w.activity, period))
  switch (w.role) {
    case 'DOCK_RECEIVER':
      return { label: 'Cartons received', qty: stats.cartonsReceived }
    case 'UNPACKER':
      return {
        label: 'Staged / damaged',
        qty: stats.productsStaged + stats.productsDamaged,
      }
    case 'PUTAWAY':
      return { label: 'Products placed', qty: stats.productsPlaced }
    case 'WMS_SUPERVISOR':
      return {
        label: 'Actions done',
        qty:
          stats.cartonsReceived +
          stats.productsStaged +
          stats.productsAssigned +
          stats.productsPlaced +
          stats.cartonsCompleted,
      }
    default:
      return { label: 'No activity', qty: 0 }
  }
}

export function roleWorkTitle(role: WorkerRole): string {
  switch (role) {
    case 'DOCK_RECEIVER':
      return 'My dock work'
    case 'UNPACKER':
      return 'My unpack work'
    case 'PUTAWAY':
      return 'My putaway work'
    case 'WMS_SUPERVISOR':
      return 'My supervisor work'
    default:
      return 'My work'
  }
}

export function formatWorkTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function periodLabel(period: WorkPeriod): string {
  if (period === 'today') return 'Today'
  if (period === 'week') return 'This week'
  return 'This month'
}

export function workCardsForRole(
  role: WorkerRole,
  stats: WorkerWorkStats,
  openProductCount: number
): { label: string; value: number }[] {
  if (role === 'DOCK_RECEIVER') return [{ label: 'Received', value: stats.cartonsReceived }]
  if (role === 'UNPACKER') {
    return [
      { label: 'Staged', value: stats.productsStaged },
      { label: 'Damaged', value: stats.productsDamaged },
    ]
  }
  if (role === 'PUTAWAY') {
    return [
      { label: 'Placed', value: stats.productsPlaced },
      { label: 'Done', value: stats.cartonsCompleted },
      { label: 'Open', value: openProductCount },
    ]
  }
  return [
    { label: 'Received', value: stats.cartonsReceived },
    { label: 'Staged', value: stats.productsStaged },
    { label: 'Assigned', value: stats.productsAssigned },
    { label: 'Placed', value: stats.productsPlaced },
  ]
}

let eventSeq = 0
export function makeWorkEvent(
  kind: WorkEventKind,
  detail?: string,
  at = new Date().toISOString()
): WorkActivityEvent {
  eventSeq += 1
  return { id: `we-${Date.now()}-${eventSeq}`, kind, at, detail }
}

export function seedWorkerActivity(_workerId: string, role: WorkerRole): WorkActivityEvent[] {
  const now = Date.now()
  const hours = (h: number) => new Date(now - h * 3600_000).toISOString()
  const days = (d: number, hour = 10) => {
    const t = new Date(now - d * 86400_000)
    t.setHours(hour, 15, 0, 0)
    return t.toISOString()
  }

  if (role === 'DOCK_RECEIVER') {
    return [
      makeWorkEvent('carton_received', 'CTN-001', hours(1)),
      makeWorkEvent('carton_received', 'CTN-002', hours(2)),
      makeWorkEvent('carton_received', 'CTN-demo', days(2)),
      makeWorkEvent('carton_received', 'CTN-demo2', days(8)),
    ]
  }
  if (role === 'UNPACKER') {
    return [
      makeWorkEvent('product_staged', '890100001 → Bag-1', hours(1)),
      makeWorkEvent('product_staged', '890100002 → Bag-1', hours(1.1)),
      makeWorkEvent('product_staged', 'CTN-demo', days(1)),
      makeWorkEvent('product_staged', 'CTN-old', days(10)),
    ]
  }
  if (role === 'PUTAWAY') {
    return [
      makeWorkEvent('product_placed', 'NK-AIR-001', hours(0.5)),
      makeWorkEvent('product_placed', 'AD-ULTRA-01', hours(1)),
      makeWorkEvent('carton_completed', 'CTN-demo', days(1)),
      makeWorkEvent('product_placed', 'PM-RSX', days(3)),
      makeWorkEvent('product_placed', 'NK-old', days(12)),
    ]
  }
  return [
    makeWorkEvent('carton_received', 'Supervised receive', hours(3)),
    makeWorkEvent('products_assigned', 'Supervised assign', days(1)),
    makeWorkEvent('product_placed', 'Supervised putaway', days(2)),
    makeWorkEvent('carton_completed', 'Supervised complete', days(9)),
  ]
}
