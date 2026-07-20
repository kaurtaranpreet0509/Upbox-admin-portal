import { useMemo, useState } from 'react'
import { PageHeader } from '@/layout/PageHeader'
import { ScanInput } from '@/components/common/ScanInput'
import { ScanFeedbackCard } from '@/components/common/ScanFeedbackCard'
import { CartonStatusBadge } from '@/components/common/Badges'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { useReceiveCarton, useShipments } from '@/hooks/useInbound'
import { useAuthStore } from '@/store/useAuthStore'

export function DockReceivePage() {
  const authUser = useAuthStore((s) => s.user)
  const myWorkerId = authUser?.workerId ?? null
  const shipmentsQ = useShipments()
  const receive = useReceiveCarton()
  const [shipmentId, setShipmentId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'warn'
    title: string
    detail?: string
  } | null>(null)

  const shipment = useMemo(() => {
    const list = shipmentsQ.data ?? []
    return list.find((s) => s.id === shipmentId) ?? list[0] ?? null
  }, [shipmentsQ.data, shipmentId])

  const receivedCount = shipment?.cartons.filter((c) => c.status !== 'PENDING').length ?? 0
  const total = shipment?.cartons.length ?? 0
  const pct = total ? Math.round((receivedCount / total) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Dock Receiving"
        actions={
          <select
            className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={shipment?.id ?? ''}
            onChange={(e) => setShipmentId(e.target.value)}
          >
            {(shipmentsQ.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.poNumber} — {s.supplierName}
              </option>
            ))}
          </select>
        }
      />

      {shipmentsQ.isLoading ? <LoadingPanel label="Loading shipments…" /> : null}

      {shipment ? (
        <>
          <div className="surface-card mb-4 space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-slate-800">
                {shipment.poNumber} · {receivedCount} / {total} cartons
              </span>
              <span className="text-slate-500">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ScanInput
              placeholder="Scan carton barcode…"
              onScan={async (barcode) => {
                try {
                  const result = await receive.mutateAsync({ barcode, workerId: myWorkerId })
                  if (result.alreadyReceived) {
                    setFeedback({
                      tone: 'warn',
                      title: `${result.carton.id} already received`,
                      detail: result.stagingLocationCode
                        ? `Already on ${result.stagingLocationCode}`
                        : 'Duplicate scan — carton was already marked received.',
                    })
                  } else {
                    setFeedback({
                      tone: 'success',
                      title: `${result.carton.id} received`,
                      detail: result.stagingLocationCode
                        ? `Staged on ${result.stagingLocationCode} · ${result.carton.productCount} products`
                        : `${result.carton.productCount} products on manifest`,
                    })
                  }
                } catch (e) {
                  setFeedback({
                    tone: 'error',
                    title: 'Scan failed',
                    detail: e instanceof Error ? e.message : 'Unknown error',
                  })
                  throw e
                }
              }}
            />
            {feedback ? (
              <ScanFeedbackCard
                {...feedback}
                autoDismissMs={2500}
                onDismiss={() => setFeedback(null)}
              />
            ) : null}
          </div>

          <div className="surface-panel overflow-hidden">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Carton</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipment.cartons.map((c) => (
                  <tr key={c.id} className="hover:bg-indigo-50/40">
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.barcode}</td>
                    <td className="px-4 py-3">{c.productCount}</td>
                    <td className="px-4 py-3">
                      <CartonStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {c.receivedAt ? new Date(c.receivedAt).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
