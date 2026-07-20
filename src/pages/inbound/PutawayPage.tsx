import { useMemo, useState } from 'react'
import { PageHeader } from '@/layout/PageHeader'
import { ScanInput } from '@/components/common/ScanInput'
import { ScanFeedbackCard } from '@/components/common/ScanFeedbackCard'
import { CartonStatusBadge } from '@/components/common/Badges'
import { useAuthStore } from '@/store/useAuthStore'
import { useMyCartons, useInvalidateInbound } from '@/hooks/useInbound'
import { inboundService } from '@/services/inbound.service'
import type { MasterCarton, ProductUnit, RackSlot, Brand } from '@/types/inbound'
import { cn } from '@/lib/cn'

type Step = 'scan_carton' | 'scan_product' | 'scan_rack' | 'rack_full'

export function PutawayPage() {
  const user = useAuthStore((s) => s.user)
  const hasRole = useAuthStore((s) => s.hasRole)
  const isSupervisor = hasRole('WMS_SUPERVISOR') || user?.userType === 'SUPER_ADMIN'
  const workerId = user?.workerId ?? null
  const myCartonsQ = useMyCartons(workerId, isSupervisor)
  const invalidate = useInvalidateInbound()

  const [step, setStep] = useState<Step>('scan_carton')
  const [carton, setCarton] = useState<MasterCarton | null>(null)
  const [product, setProduct] = useState<ProductUnit | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [targetRack, setTargetRack] = useState<RackSlot | null>(null)
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

  const refreshCarton = async (cartonId: string) => {
    const updated = await inboundService.getCarton(cartonId)
    if (!updated || updated.status === 'COMPLETE') {
      setCarton(null)
      setProduct(null)
      setBrand(null)
      setTargetRack(null)
      setStep('scan_carton')
      invalidate()
      return null
    }
    setCarton(updated)
    invalidate()
    return updated
  }

  const resetProductLoop = async () => {
    if (!carton) return
    const updated = await refreshCarton(carton.id)
    if (!updated) return
    setProduct(null)
    setBrand(null)
    setTargetRack(null)
    setStep('scan_product')
  }

  return (
    <div>
      <PageHeader title="Putaway" />

      {carton ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="font-semibold text-slate-900">
            {carton.id} · Progress {placed} / {total}
          </span>
          <div className="flex items-center gap-2">
            <CartonStatusBadge status={carton.status} />
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => {
                setCarton(null)
                setProduct(null)
                setBrand(null)
                setTargetRack(null)
                setStep('scan_carton')
              }}
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
                  setCarton(opened)
                  setStep('scan_product')
                  setFeedback({ tone: 'success', title: `${opened.id} opened` })
                  invalidate()
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
                    className="cursor-pointer flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                    onClick={async () => {
                      const opened = await inboundService.openCarton(
                        c.id,
                        workerId ?? '',
                        isSupervisor
                      )
                      setCarton(opened)
                      setStep('scan_product')
                      invalidate()
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

        {step === 'scan_product' && carton ? (
          <>
            <ScanInput
              placeholder="Scan product barcode…"
              onScan={async (barcode) => {
                try {
                  const result = await inboundService.scanProduct(barcode, carton.id)
                  const refreshed = await inboundService.getCarton(carton.id)
                  if (refreshed) setCarton(refreshed)
                  setProduct(result.product)
                  setBrand(result.brand)
                  setTargetRack(result.targetRack)
                  setStep(result.targetRack?.status === 'FULL' ? 'rack_full' : 'scan_rack')
                  setFeedback({
                    tone: 'success',
                    title: 'Product found',
                    detail: `${result.product.sku} · ${result.brand.name}`,
                  })
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
          </>
        ) : null}

        {(step === 'scan_rack' || step === 'rack_full') && product && brand ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <p className="text-sm font-bold text-emerald-900">Product found</p>
              <p className="mt-1 text-sm text-slate-800">
                SKU: <strong>{product.sku}</strong> · Brand: <strong>{brand.name}</strong>
              </p>
              <p className="mt-1 text-xs text-slate-600">{product.description}</p>
              {targetRack && step === 'scan_rack' ? (
                <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-sky-900">Target rack: {targetRack.label}</p>
                  <p className="mt-1 text-xs text-sky-800">
                    Fill: {targetRack.filled} / {targetRack.capacity} (
                    {Math.round((targetRack.filled / targetRack.capacity) * 100)}%)
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
                    <div
                      className="h-full bg-sky-500"
                      style={{
                        width: `${Math.min(100, (targetRack.filled / targetRack.capacity) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {step === 'rack_full' ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Rack {targetRack?.label ?? ''} is full. Scan any empty rack to claim it for{' '}
                <strong>{brand.name}</strong>.
              </div>
            ) : null}

            <ScanInput
              placeholder={
                step === 'rack_full' ? 'Scan empty rack label…' : 'Scan rack label to confirm…'
              }
              onScan={async (barcode) => {
                if (!carton || !product) return
                try {
                  const racks = await inboundService.getRacks()
                  const rack =
                    racks.find((r) => r.label === barcode || r.id === barcode) ?? null
                  if (!rack) throw new Error('Rack not found')

                  if (step === 'rack_full') {
                    if (rack.status !== 'EMPTY' && rack.filled > 0) {
                      throw new Error('Please scan an empty rack')
                    }
                    const claimed = await inboundService.claimEmptyRack(rack.id, brand.id)
                    await inboundService.confirmPlacement(product.id, claimed.id, carton.id, workerId)
                    setFeedback({
                      tone: 'success',
                      title: `Placed on new rack ${claimed.label}`,
                      detail: `Claimed for ${brand.name}`,
                    })
                    await resetProductLoop()
                    return
                  }

                  if (targetRack && rack.id !== targetRack.id && rack.brandId !== brand.id) {
                    throw new Error(`Wrong rack — expected ${targetRack.label}`)
                  }

                  try {
                    await inboundService.confirmPlacement(product.id, rack.id, carton.id, workerId)
                    setFeedback({ tone: 'success', title: `Placed on ${rack.label}` })
                    await resetProductLoop()
                  } catch (e) {
                    if (e instanceof Error && e.message === 'RACK_FULL') {
                      setTargetRack(rack)
                      setStep('rack_full')
                      setFeedback({
                        tone: 'warn',
                        title: 'Rack is full',
                        detail: 'Scan an empty rack to claim for this brand.',
                      })
                      return
                    }
                    throw e
                  }
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
