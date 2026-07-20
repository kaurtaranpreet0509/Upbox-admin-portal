import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartColumn, Users } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { useAssignWorkerJob, useWorkers } from '@/hooks/useInbound'
import { useAuthStore } from '@/store/useAuthStore'
import {
  ASSIGNABLE_JOBS,
  formatDuration,
  isOnShift,
  roleJobLabel,
  shiftDurationMs,
} from '@/lib/shifts'
import { formatWorkTime } from '@/lib/workerActivity'
import type { WarehouseWorker } from '@/types/inbound'
import { cn } from '@/lib/cn'

export function WorkersPage() {
  const setUserRoles = useAuthStore((s) => s.setUserRoles)
  const currentWorkerId = useAuthStore((s) => s.user?.workerId)
  const workersQ = useWorkers()
  const assignJob = useAssignWorkerJob()
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const workers = workersQ.data ?? []
  const onShift = useMemo(() => workers.filter(isOnShift), [workers])
  const offShift = useMemo(() => workers.filter((w) => !isOnShift(w)), [workers])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const onAssign = async (worker: WarehouseWorker, role: 'DOCK_RECEIVER' | 'SORTER' | 'PUTAWAY') => {
    setError(null)
    try {
      await assignJob.mutateAsync({ workerId: worker.id, role })
      if (worker.id === currentWorkerId) setUserRoles([role])
      showToast(`${worker.name} → ${roleJobLabel(role)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign failed')
    }
  }

  return (
    <div>
      <PageHeader
        title="Workers"
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-800">{onShift.length} on shift</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">{workers.length} total</span>
          </div>
        }
      />

      {toast ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {workersQ.isLoading ? <LoadingPanel label="Loading workers…" /> : null}

      {workersQ.data ? (
        <div className="space-y-6">
          <WorkerSection
            title="On shift"
            empty="Nobody is on shift right now."
            workers={onShift}
            onAssign={onAssign}
            busy={assignJob.isPending}
          />
          <WorkerSection
            title="Off shift"
            empty="Everyone is currently on shift."
            workers={offShift}
            onAssign={onAssign}
            busy={assignJob.isPending}
          />
        </div>
      ) : null}
    </div>
  )
}

function WorkerSection(props: {
  title: string
  empty: string
  workers: WarehouseWorker[]
  busy: boolean
  onAssign: (worker: WarehouseWorker, role: 'DOCK_RECEIVER' | 'SORTER' | 'PUTAWAY') => void
}) {
  return (
    <section className="surface-panel overflow-hidden">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
        {props.title} ({props.workers.length})
      </h2>
      {props.workers.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">{props.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Current job</th>
                <th className="px-4 py-3">Assign job</th>
                <th className="px-4 py-3">Work</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {props.workers.map((w) => {
                const on = isOnShift(w)
                const open = w.shifts.find((s) => !s.endedAt)
                const isSupervisor = w.role === 'WMS_SUPERVISOR'
                return (
                  <tr key={w.id} className="hover:bg-indigo-50/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{w.name}</div>
                      <div className="text-xs text-slate-500">{w.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {on ? (
                        <div>
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            Working
                          </span>
                          {open ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Since {formatWorkTime(open.startedAt)} ·{' '}
                              {formatDuration(shiftDurationMs(open))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                          Off shift
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-lg px-2 py-1 text-xs font-bold',
                          isSupervisor
                            ? 'bg-violet-50 text-violet-800 ring-1 ring-violet-200'
                            : 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'
                        )}
                      >
                        {roleJobLabel(w.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isSupervisor ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <select
                          className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                          value={w.role}
                          disabled={props.busy}
                          onChange={(e) =>
                            props.onAssign(
                              w,
                              e.target.value as 'DOCK_RECEIVER' | 'SORTER' | 'PUTAWAY'
                            )
                          }
                        >
                          {ASSIGNABLE_JOBS.map((j) => (
                            <option key={j.value} value={j.value}>
                              {j.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/inbound/workers/${w.id}`}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ChartColumn className="h-3.5 w-3.5" />
                        View work
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
