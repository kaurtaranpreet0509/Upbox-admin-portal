import { useMemo, useState } from 'react'
import { PageHeader } from '@/layout/PageHeader'
import { ScanInput } from '@/components/common/ScanInput'
import { ScanFeedbackCard } from '@/components/common/ScanFeedbackCard'
import { CartonStatusBadge, ZoneTypeBadge } from '@/components/common/Badges'
import { useAuthStore } from '@/store/useAuthStore'
import { useMyCartons, useInvalidateInbound } from '@/hooks/useInbound'
import { inboundService } from '@/services/inbound.service'
import type { MasterCarton, RackSlot } from '@/types/inbound'
import { cn } from '@/lib/cn'

type Step = 'scan_carton' | 'scan_rack' | 'scan_products'

export function PutawayPage() {
  const user = useAuthStore((s) => s.user)
  const hasRole = useAuthStore((s) => s.hasRole)
  const isSupervisor = hasRole('WMS_SUPERVISOR') || user?.userType === 'SUPER_ADMIN'
  const workerId = user?.workerId ?? null
  const myCartonsQ = useMyCartons(workerId, isSupervisor)
  const invalidate = useInvalidateInbound()

  const [step, setStep] = useState<Step>('scan_carton')
  const [carton, setCarton] = useState<MasterCarton | null>(null)
  const [activeRack, setActiveRack] = useState<RackSlot | null>(null)
  const [sessionPlaced, setSessionPlaced] = useState(0)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'warn'
    title: string
    detail?: string
  } | null>(null)

  const placed = useMemo(
    () => carton?.products.filter((p) => p.status === 'PLACED').length ?? 0,
    [carton]
  )
  const total = carton?.productCount ?? 0
  const remaining = total - placed

  const refreshCarton = async (cartonId: string) => {
    const updated = await inboundService.getCarton(cartonId)
    if (!updated || updated.status === 'COMPLETE') {
      setCarton(null)
      setActiveRack(null)
      setSessionPlaced(0)
      setStep('scan_carton')
      invalidate()
      return null
    }
    setCarton(updated)
    invalidate()
    return updated
  }

  const openCarton = async (opened: MasterCarton) => {
    setCarton(opened)
    setActiveRack(null)
    setSessionPlaced(0)
    setStep('scan_rack')
    setFeedback({ tone: 'success', title: `${opened.id} opened`, detail: 'Scan a Pick (P) or Inspection (I) rack' })
    invalidate()
  }

  const stopRack = () => {
    const label = activeRack?.label
    setActiveRack(null)
    setSessionPlaced(0)
    setStep('scan_rack')
    setFeedback({
      tone: 'warn',
      title: label ? `Stopped rack ${label}` : 'Rack stopped',
      detail: 'Scan another Pick (P) or Inspection (I) rack',
    })
  }

  const closeCarton = () => {
    setCarton(null)
    setActiveRack(null)
    setSessionPlaced(0)
    setStep('scan_carton')
  }

  return (
    <div>
      <PageHeader title="Putaway" />

      {carton ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="font-semibold text-slate-900">
            {carton.id} · Progress {placed} / {total}
            {remaining > 0 ? (
              <span className="ml-2 font-normal text-slate-500">({remaining} left)</span>
            ) : null}
          </span>
          <div className="flex items-center gap-2">
            <CartonStatusBadge status={carton.status} />
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onClick={closeCarton}
            >
              Close carton
            </button>
          </div>
        </div>
      ) : null}

      <div className="surface-card mb-4 space-y-4 p-4">
        {step === 'scan_carton' ? (
          <>
            <ScanInput
              placeholder="Scan assigned carton barcode (e.g. CTN890003)…"
              onScan={async (barcode) => {
                if (!workerId && !isSupervisor) throw new Error('Not logged in')
                try {
                  const opened = await inboundService.openCartonByBarcode(
                    barcode,
                    workerId ?? '',
                    isSupervisor
                  )
                  await openCarton(opened)
                } catch (e) {
                  setFeedback({
                    tone: 'error',
                    title: 'Cannot open carton',
                    detail: e instanceof Error ? e.message : 'Error',
                  })
                  throw e
                }
              }}
            />
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {isSupervisor ? 'All cartons ready for putaway' : 'My assigned cartons'}
              </h3>
              <div className="space-y-2">
                {(myCartonsQ.data ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                    onClick={async () => {
                      const opened = await inboundService.openCarton(
                        c.id,
                        workerId ?? '',
                        isSupervisor
                      )
                      await openCarton(opened)
                    }}
                  >
                    <span className="font-semibold">{c.id}</span>
                    <span className="text-xs text-slate-500">
                      {c.productCount} items · {c.barcode}
                    </span>
                  </button>
                ))}
                {(myCartonsQ.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-500">
                    {isSupervisor
                      ? 'No cartons awaiting putaway. Receive and assign cartons first.'
                      : 'No cartons assigned to you yet.'}
                  </p>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {step === 'scan_rack' && carton ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <p className="font-semibold">1. Scan a rack</p>
              <p className="mt-1 text-xs text-sky-800">
                Use a Pick rack (<span className="font-mono font-bold">…-P</span>) or Inspection rack (
                <span className="font-mono font-bold">…-I</span>). Then keep scanning products into it.
              </p>
            </div>
            <ScanInput
              placeholder="Scan rack (e.g. A-1-1-P or A-2-1-I)…"
              onScan={async (barcode) => {
                try {
                  const racks = await inboundService.getRacks()
                  const rack =
                    racks.find(
                      (r) =>
                        r.label.toLowerCase() === barcode.trim().toLowerCase() ||
                        r.id === barcode.trim()
                    ) ?? null
                  if (!rack) throw new Error('Rack not found')
                  if (rack.zoneType === 'goods_in') {
                    throw new Error('Dock staging is for cartons only — scan a Pick (P) or Inspection (I) rack')
                  }
                  if (rack.status === 'FULL') {
                    throw new Error(`Rack ${rack.label} is full — scan another rack`)
                  }
                  setActiveRack(rack)
                  setSessionPlaced(0)
                  setStep('scan_products')
                  setFeedback({
                    tone: 'success',
                    title: `Working on ${rack.label}`,
                    detail:
                      rack.zoneType === 'inspection'
                        ? 'Inspection rack — scan products to place here'
                        : 'Pick rack — scan products to place here',
                  })
                } catch (e) {
                  setFeedback({
                    tone: 'error',
                    title: 'Rack scan failed',
                    detail: e instanceof Error ? e.message : 'Error',
                  })
                  throw e
                }
              }}
            />
          </div>
        ) : null}

        {step === 'scan_products' && carton && activeRack ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-emerald-900">Active rack: {activeRack.label}</p>
                  <ZoneTypeBadge zone={activeRack.zoneType} />
                </div>
                <p className="text-xs text-emerald-800">
                  Fill: {activeRack.filled} / {activeRack.capacity} · Placed this session: {sessionPlaced}
                </p>
                <div className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${Math.min(100, (activeRack.filled / activeRack.capacity) * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Keep scanning products into this rack. When done here, stop and scan another rack.
                </p>
              </div>
              <button
                type="button"
                onClick={stopRack}
                className="cursor-pointer rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
              >
                Stop this rack
              </button>
            </div>

            <ScanInput
              placeholder="Scan product barcode to place on this rack…"
              onScan={async (barcode) => {
                if (!carton || !activeRack) return
                try {
                  const result = await inboundService.scanProduct(barcode, carton.id)
                  try {
                    await inboundService.confirmPlacement(
                      result.product.id,
                      activeRack.id,
                      carton.id,
                      workerId
                    )
                  } catch (e) {
                    if (e instanceof Error && e.message === 'RACK_FULL') {
                      setActiveRack(null)
                      setSessionPlaced(0)
                      setStep('scan_rack')
                      setFeedback({
                        tone: 'warn',
                        title: `Rack ${activeRack.label} is full`,
                        detail: 'Scan another Pick (P) or Inspection (I) rack.',
                      })
                      return
                    }
                    throw e
                  }

                  const racks = await inboundService.getRacks()
                  const refreshedRack = racks.find((r) => r.id === activeRack.id) ?? null
                  if (refreshedRack) setActiveRack(refreshedRack)
                  setSessionPlaced((n) => n + 1)

                  const updated = await refreshCarton(carton.id)
                  setFeedback({
                    tone: 'success',
                    title: `Placed ${result.product.sku}`,
                    detail: `On ${activeRack.label} · ${result.brand.name}`,
                  })

                  if (!updated) return
                  if (refreshedRack?.status === 'FULL') {
                    setFeedback({
                      tone: 'warn',
                      title: `Rack ${activeRack.label} is now full`,
                      detail: 'Stopped — scan another rack to continue.',
                    })
                    setActiveRack(null)
                    setSessionPlaced(0)
                    setStep('scan_rack')
                  }
                } catch (e) {
                  setFeedback({
                    tone: 'error',
                    title: 'Product scan failed',
                    detail: e instanceof Error ? e.message : 'Error',
                  })
                  throw e
                }
              }}
            />
          </div>
        ) : null}

        {feedback ? (
          <ScanFeedbackCard {...feedback} autoDismissMs={3500} onDismiss={() => setFeedback(null)} />
        ) : null}
      </div>

      {carton ? (
        <div className="surface-panel p-4">
          <h3 className="mb-2 text-xs font-bold uppercase text-slate-500">Carton products</h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {carton.products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className={cn('min-w-0', p.status === 'PLACED' && 'text-slate-400 line-through')}>
                  <span className="font-medium">{p.sku}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="font-mono text-xs text-sky-700">{p.barcode}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold uppercase text-slate-500">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
