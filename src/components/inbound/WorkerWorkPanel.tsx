import { useMemo, useState } from 'react'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import {
  filterActivityByPeriod,
  formatWorkTime,
  periodLabel,
  summarizeActivity,
  workCardsForRole,
  workerActivitySummary,
} from '@/lib/workerActivity'
import { roleJobLabel } from '@/lib/shifts'
import type { WarehouseWorker, WorkPeriod } from '@/types/inbound'
import { cn } from '@/lib/cn'

const PERIODS: WorkPeriod[] = ['today', 'week', 'month']

export function WorkerWorkPanel(props: {
  worker: WarehouseWorker | null | undefined
  loading?: boolean
}) {
  const [period, setPeriod] = useState<WorkPeriod>('today')
  const worker = props.worker

  const periodStats = useMemo(() => {
    if (!worker) return null
    const filtered = filterActivityByPeriod(worker.activity, period)
    const summary = summarizeActivity(filtered)
    const primary = workerActivitySummary(worker, period)
    const cards = workCardsForRole(worker.role, summary, worker.openProductCount)
    const recent = [...filtered].sort((a, b) => b.at.localeCompare(a.at))
    return { summary, primary, cards, recent }
  }, [worker, period])

  if (props.loading) return <LoadingPanel label="Loading work…" />
  if (!worker || !periodStats) return null

  return (
    <>
      <div className="surface-card mb-4 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Job</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{roleJobLabel(worker.role)}</p>
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
        <div className="surface-card flex flex-wrap items-end justify-between gap-3 p-5 sm:col-span-2">
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
