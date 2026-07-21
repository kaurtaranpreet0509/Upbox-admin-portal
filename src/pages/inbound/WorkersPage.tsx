import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartColumn, Users } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { useAssignWorkerJob, useWorkers } from '@/hooks/useInbound'
import { useAuthStore } from '@/store/useAuthStore'
import { ASSIGNABLE_JOBS, roleJobLabel } from '@/lib/shifts'
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

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const onAssign = async (
    worker: WarehouseWorker,
    role: 'DOCK_RECEIVER' | 'UNPACKER' | 'PUTAWAY'
  ) => {
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
            <span className="font-semibold text-slate-800">{workers.length} workers</span>
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
        <section className="surface-panel overflow-hidden">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Floor roster
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Current job</th>
                  <th className="px-4 py-3">Assign job</th>
                  <th className="px-4 py-3">Open products</th>
                  <th className="px-4 py-3">Work</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workers.map((w) => {
                  const isSupervisor = w.role === 'WMS_SUPERVISOR'
                  return (
                    <tr key={w.id} className="hover:bg-indigo-50/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{w.name}</div>
                        <div className="text-xs text-slate-500">{w.email}</div>
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
                            disabled={assignJob.isPending}
                            onChange={(e) =>
                              void onAssign(
                                w,
                                e.target.value as 'DOCK_RECEIVER' | 'UNPACKER' | 'PUTAWAY'
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
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {w.role === 'PUTAWAY' ? w.openProductCount : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/inbound/workers/${w.id}`}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
        </section>
      ) : null}
    </div>
  )
}
