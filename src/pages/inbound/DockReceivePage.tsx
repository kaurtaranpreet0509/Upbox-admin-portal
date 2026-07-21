import { useMemo, useState } from 'react'
import { PageHeader } from '@/layout/PageHeader'
import { ScanInput } from '@/components/common/ScanInput'
import { ScanFeedbackCard } from '@/components/common/ScanFeedbackCard'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { CartonExpandList } from '@/components/common/ExpandLists'
import { useReceiveCarton, useShipments } from '@/hooks/useInbound'
import { useAuthStore } from '@/store/useAuthStore'
import { inboundService } from '@/services/inbound.service'

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
                  const cartonCode = await inboundService.requireCartonScan(barcode)
                  const result = await receive.mutateAsync({
                    barcode: cartonCode,
                    workerId: myWorkerId,
                  })
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

          <CartonExpandList
            cartons={shipment.cartons}
            title="Shipment cartons"
            emptyLabel="No cartons on this shipment."
          />
        </>
      ) : null}
    </div>
  )
}
