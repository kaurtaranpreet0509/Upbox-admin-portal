import type { ShiftRecord, WarehouseWorker, WorkPeriod } from '@/types/inbound'
import { periodStart } from '@/lib/workerActivity'

export function isOnShift(worker: WarehouseWorker): boolean {
  return !!worker.shiftStartedAt
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export function shiftDurationMs(shift: ShiftRecord, now = Date.now()): number {
  const start = new Date(shift.startedAt).getTime()
  const end = shift.endedAt ? new Date(shift.endedAt).getTime() : now
  return Math.max(0, end - start)
}

/** Hours worked in period (includes open shift if started in/overlapping period). */
export function workedMsInPeriod(worker: WarehouseWorker, period: WorkPeriod, now = Date.now()): number {
  const start = periodStart(period).getTime()
  let total = 0
  for (const shift of worker.shifts) {
    const s = new Date(shift.startedAt).getTime()
    const e = shift.endedAt ? new Date(shift.endedAt).getTime() : now
    if (e < start) continue
    const from = Math.max(s, start)
    const to = e
    if (to > from) total += to - from
  }
  return total
}

export function roleJobLabel(role: string): string {
  switch (role) {
    case 'DOCK_RECEIVER':
      return 'Dock'
    case 'SORTER':
      return 'Sort'
    case 'PUTAWAY':
      return 'Putaway'
    case 'WMS_SUPERVISOR':
      return 'Supervisor'
    default:
      return role
  }
}

export const ASSIGNABLE_JOBS = [
  { value: 'DOCK_RECEIVER' as const, label: 'Dock Receiving' },
  { value: 'SORTER' as const, label: 'Sort & Assign' },
  { value: 'PUTAWAY' as const, label: 'Putaway' },
]
