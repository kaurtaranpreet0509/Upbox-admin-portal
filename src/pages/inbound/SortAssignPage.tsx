import { useState } from 'react'
import { PageHeader } from '@/layout/PageHeader'
import { ScanInput } from '@/components/common/ScanInput'
import { ScanFeedbackCard } from '@/components/common/ScanFeedbackCard'
import { CartonStatusBadge } from '@/components/common/Badges'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import {
  useAssignCarton,
  useAssignedCartons,
  useUnassignedCartons,
  useWorkers,
} from '@/hooks/useInbound'
import { useAuthStore } from '@/store/useAuthStore'
import type { MasterCarton } from '@/types/inbound'
import { cn } from '@/lib/cn'

export function SortAssignPage() {
  const authUser = useAuthStore((s) => s.user)
  const sorterId = authUser?.workerId ?? null
  const unassignedQ = useUnassignedCartons()
  const assignedQ = useAssignedCartons()
  const workersQ = useWorkers()
  const assign = useAssignCarton()
  const [modalCarton, setModalCarton] = useState<MasterCarton | null>(null)
  const [workerId, setWorkerId] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'warn'; title: string; detail?: string } | null>(
    null
  )

  const putawayWorkers = (workersQ.data ?? []).filter((w) => w.role === 'PUTAWAY')

  const openAssign = (carton: MasterCarton) => {
    setModalCarton(carton)
    setWorkerId(putawayWorkers[0]?.id ?? '')
  }

  return (
    <div>
      <PageHeader title="Sort & Assign" />

      <div className="surface-card mb-4 space-y-3 p-4">
        <ScanInput
          placeholder="Scan carton barcode to assign…"
          onScan={async (barcode) => {
            const carton = (unassignedQ.data ?? []).find((c) => c.barcode === barcode || c.id === barcode)
            if (!carton) {
              setFeedback({ tone: 'error', title: 'Not in queue', detail: 'Carton is not awaiting assignment.' })
              throw new Error('not in queue')
            }
            openAssign(carton)
            setFeedback({ tone: 'success', title: `${carton.id} ready to assign` })
          }}
        />
        {feedback ? (
          <ScanFeedbackCard {...feedback} autoDismissMs={2000} onDismiss={() => setFeedback(null)} />
        ) : null}
      </div>

      {(unassignedQ.isLoading || assignedQ.isLoading) && <LoadingPanel label="Loading queue…" />}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Queue ({unassignedQ.data?.length ?? 0})
          </h2>
          <div className="space-y-3">
            {(unassignedQ.data ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openAssign(c)}
                className="w-full cursor-pointer rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left hover:bg-amber-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{c.id}</span>
                  <CartonStatusBadge status={c.status} />
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {c.productCount} items · {c.barcode}
                </p>
              </button>
            ))}
            {(unassignedQ.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No cartons awaiting assignment.</p>
            ) : null}
          </div>
        </section>

        <section className="surface-panel p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Assigned today ({assignedQ.data?.length ?? 0})
          </h2>
          <div className="space-y-3">
            {(assignedQ.data ?? []).map((c) => {
              const worker = (workersQ.data ?? []).find((w) => w.id === c.assignedWorkerId)
              return (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{c.id}</span>
                    <CartonStatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    → {worker?.name ?? '—'} · {c.productCount} items
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {modalCarton ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-heading text-lg text-slate-900">Assign {modalCarton.id}</h3>
            <p className="mt-1 text-sm text-slate-600">{modalCarton.productCount} products · {modalCarton.barcode}</p>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Putaway worker</p>
              {putawayWorkers.map((w) => (
                <label
                  key={w.id}
                  className={cn('flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm',
                    workerId === w.id ? 'border-primary-400 bg-primary-50' : 'border-slate-200',
                    w.openCartonCount >= 5 && 'ring-1 ring-amber-300'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="worker"
                      checked={workerId === w.id}
                      onChange={() => setWorkerId(w.id)}
                    />
                    {w.name}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-bold',
                      w.openCartonCount >= 5 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {w.openCartonCount} open
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                onClick={() => setModalCarton(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!workerId || assign.isPending}
                className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-40"
                onClick={async () => {
                  try {
                    await assign.mutateAsync({ cartonId: modalCarton.id, workerId, sorterId })
                    setFeedback({ tone: 'success', title: `${modalCarton.id} assigned` })
                    setModalCarton(null)
                  } catch (e) {
                    setFeedback({
                      tone: 'error',
                      title: 'Assign failed',
                      detail: e instanceof Error ? e.message : 'Error',
                    })
                  }
                }}
              >
                Confirm assign
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
