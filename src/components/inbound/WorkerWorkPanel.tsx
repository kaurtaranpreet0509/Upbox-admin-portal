import { useEffect, useMemo, useState } from 'react'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import {
  filterActivityByPeriod,
  formatWorkTime,
  periodLabel,
  periodStart,
  summarizeActivity,
  workCardsForRole,
  workerActivitySummary,
} from '@/lib/workerActivity'
import {
  formatDuration,
  isOnShift,
  roleJobLabel,
  shiftDurationMs,
  workedMsInPeriod,
} from '@/lib/shifts'
import type { ShiftRecord, WarehouseWorker, WorkPeriod } from '@/types/inbound'
import { cn } from '@/lib/cn'

const PERIODS: WorkPeriod[] = ['today', 'week', 'month']

function shiftsInPeriod(shifts: ShiftRecord[], period: WorkPeriod, now: number): ShiftRecord[] {
  const begin = periodStart(period).getTime()
  return shifts.filter((s) => {
    const startMs = new Date(s.startedAt).getTime()
    const endMs = s.endedAt ? new Date(s.endedAt).getTime() : now
    return endMs >= begin && startMs <= now
  })
}

export function WorkerWorkPanel(props: {
  worker: WarehouseWorker | null | undefined
  loading?: boolean
  /** Own My work: start/end shift controls */
  shiftControls?: {
    onStart: () => void
    onEnd: () => void
    startPending?: boolean
    endPending?: boolean
    error?: string | null
    highlightStart?: boolean
  }
}) {
  const [period, setPeriod] = useState<WorkPeriod>('today')
  const [now, setNow] = useState(() => Date.now())
  const worker = props.worker

  useEffect(() => {
    if (!worker?.shiftStartedAt) return
    const t = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(t)
  }, [worker?.shiftStartedAt])

  const periodStats = useMemo(() => {
    if (!worker) return null
    const filtered = filterActivityByPeriod(worker.activity, period)
    const summary = summarizeActivity(filtered)
    const primary = workerActivitySummary(worker, period)
    const cards = workCardsForRole(worker.role, summary, worker.openCartonCount)
    const recent = [...filtered].sort((a, b) => b.at.localeCompare(a.at))
    const hoursMs = workedMsInPeriod(worker, period, now)
    const open = worker.shifts.find((s) => !s.endedAt)
    const periodShifts = shiftsInPeriod(worker.shifts, period, now)
    return { summary, primary, cards, recent, hoursMs, open, periodShifts }
  }, [worker, period, now])

  if (props.loading) return <LoadingPanel label="Loading work…" />
  if (!worker || !periodStats) return null

  const controls = props.shiftControls

  return (
    <>
      <div
        className={cn(
          'surface-card mb-4 flex flex-wrap items-center justify-between gap-3 p-4',
          controls?.highlightStart && !isOnShift(worker) && 'ring-2 ring-amber-400'
        )}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Shift</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {isOnShift(worker) ? (
              <>
                On shift · {roleJobLabel(worker.role)}
                {periodStats.open ? (
                  <span className="ml-2 font-normal text-slate-500">
                    ({formatDuration(shiftDurationMs(periodStats.open, now))} so far)
                  </span>
                ) : null}
              </>
            ) : (
              <>Off shift · {roleJobLabel(worker.role)}</>
            )}
          </p>
          {periodStats.open && isOnShift(worker) ? (
            <p className="mt-0.5 text-xs text-slate-500">
              Started {formatWorkTime(periodStats.open.startedAt)}
            </p>
          ) : null}
        </div>
        {controls ? (
          isOnShift(worker) ? (
            <button
              type="button"
              disabled={controls.endPending}
              onClick={controls.onEnd}
              className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-40"
            >
              End shift
            </button>
          ) : (
            <button
              type="button"
              disabled={controls.startPending}
              onClick={controls.onStart}
              className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Start shift
            </button>
          )
        ) : null}
        {controls?.error ? <p className="w-full text-sm text-rose-700">{controls.error}</p> : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              'cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition',
              period === p
                ? 'bg-primary-600 text-white shadow-sm'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            )}
          >
            {periodLabel(p)}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="surface-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Hours worked · {periodLabel(period)}
          </p>
          <p className="mt-1 font-heading text-3xl text-slate-900">
            {formatDuration(periodStats.hoursMs)}
          </p>
        </div>
        <div className="surface-card flex flex-wrap items-end justify-between gap-3 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {periodLabel(period)} summary
            </p>
            <p className="mt-1 font-heading text-2xl text-slate-900">
              {periodStats.primary.label}: {periodStats.primary.qty}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Last activity: <strong>{formatWorkTime(periodStats.summary.lastAt)}</strong>
            </p>
          </div>
          <p className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-900 ring-1 ring-sky-200">
            {periodStats.summary.eventCount} events
          </p>
        </div>
      </div>

      <div
        className={cn(
          'mb-6 grid gap-3',
          periodStats.cards.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'
        )}
      >
        {periodStats.cards.map((c) => (
          <div key={c.label} className="surface-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="mt-1 font-heading text-3xl text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="surface-panel mb-6 overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
          Shift log · {periodLabel(period)}
        </h2>
        {periodStats.periodShifts.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No shifts in this period.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Ended</th>
                <th className="px-4 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodStats.periodShifts.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-mono text-xs">{formatWorkTime(s.startedAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {s.endedAt ? formatWorkTime(s.endedAt) : 'In progress'}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatDuration(shiftDurationMs(s, now))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="surface-panel overflow-hidden">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
          Activity log — {periodLabel(period)}
        </h2>
        {periodStats.recent.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No work recorded in this period yet.
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodStats.recent.map((e) => (
                <tr key={e.id} className="hover:bg-indigo-50/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                    {formatWorkTime(e.at)}
                  </td>
                  <td className="px-4 py-3 font-semibold capitalize text-slate-800">
                    {e.kind.replaceAll('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{e.detail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
