import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { ScanInput } from '@/components/common/ScanInput'
import { ScanFeedbackCard } from '@/components/common/ScanFeedbackCard'
import { ZoneTypeBadge } from '@/components/common/Badges'
import { GroupedProductExpandList } from '@/components/common/ExpandLists'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { useAuthStore } from '@/store/useAuthStore'
import { useInvalidateInbound, useMyAssignedProducts } from '@/hooks/useInbound'
import { inboundService } from '@/services/inbound.service'
import type { ProductUnit, RackSlot } from '@/types/inbound'
import { cn } from '@/lib/cn'

type Step = 'scan_bag' | 'scan_product' | 'scan_rack'

export function PutawayPage() {
  const user = useAuthStore((s) => s.user)
  const hasRole = useAuthStore((s) => s.hasRole)
  const isSupervisor = hasRole('WMS_SUPERVISOR') || user?.userType === 'SUPER_ADMIN'
  const workerId = user?.workerId ?? ''
  const queueQ = useMyAssignedProducts(workerId || null, isSupervisor)
  const invalidate = useInvalidateInbound()

  const [step, setStep] = useState<Step>('scan_bag')
  const [bagLabel, setBagLabel] = useState<string | null>(null)
  const [pending, setPending] = useState<{
    product: ProductUnit
    targetRack: RackSlot | null
  } | null>(null)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'warn'
    title: string
    detail?: string
  } | null>(null)

  const queue = queueQ.data ?? []

  const bagQueue = useMemo(() => {
    if (!bagLabel) return []
    const q = bagLabel.trim().toLowerCase()
    return queue.filter((p) => (p.stagingContainerLabel ?? '').trim().toLowerCase() === q)
  }, [queue, bagLabel])

  const byRack = useMemo(() => {
    const source = bagLabel ? bagQueue : queue
    const map = new Map<string, typeof source>()
    for (const p of source) {
      const key = p.assignedRackLabel ?? p.assignedRackSlotId ?? 'Unassigned rack'
      const list = map.get(key) ?? []
      list.push(p)
      map.set(key, list)
    }
    return [...map.entries()]
      .map(([label, products]) => ({
        key: label,
        label,
        sublabel: `${products.length} to place`,
        products,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [queue, bagQueue, bagLabel])

  const resetBag = () => {
    setBagLabel(null)
    setPending(null)
    setStep('scan_bag')
    setFeedback(null)
  }

  return (
    <div>
      <PageHeader title="Putaway" />

      <StepStrip step={step} />

      {feedback ? (
        <div className="mb-4">
          <ScanFeedbackCard tone={feedback.tone} title={feedback.title} detail={feedback.detail} />
        </div>
      ) : null}

      <div className="surface-card mb-6 p-4">
        {step === 'scan_bag' ? (
          <>
            <p className="mb-2 text-sm font-semibold text-slate-800">1. Scan bag / trolley</p>
            <p className="mb-3 text-sm text-slate-600">
              Scan the bag or trolley you are working from, then scan each product from it.
            </p>
            <ScanInput
              placeholder="Scan bag / trolley label then Enter…"
              onScan={async (raw) => {
                try {
                  const label = await inboundService.requireBagScan(raw)
                  const q = label.toLowerCase()
                  const inBag = queue.filter(
                    (p) => (p.stagingContainerLabel ?? '').trim().toLowerCase() === q
                  )
                  if (inBag.length === 0) {
                    const msg = `No assigned products in “${label}” for you.`
                    setFeedback({ tone: 'error', title: 'Bag scan failed', detail: msg })
                    throw new Error(msg)
                  }
                  const canonical = inBag[0]!.stagingContainerLabel!.trim()
                  setBagLabel(canonical)
                  setPending(null)
                  setStep('scan_product')
                  setFeedback({
                    tone: 'success',
                    title: `${canonical} ready`,
                    detail: `${inBag.length} product${inBag.length === 1 ? '' : 's'} — scan the first product`,
                  })
                } catch (e) {
                  setFeedback({
                    tone: 'error',
                    title: 'Bag scan failed',
                    detail: e instanceof Error ? e.message : 'Failed',
                  })
                  throw e
                }
              }}
            />
          </>
        ) : null}

        {step === 'scan_product' && bagLabel ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                2. Scan product from{' '}
                <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-amber-950 ring-1 ring-amber-200">
                  {bagLabel}
                </span>
              </p>
              <button
                type="button"
                className="cursor-pointer text-xs font-semibold text-slate-500 hover:underline"
                onClick={resetBag}
              >
                Change bag
              </button>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              {bagQueue.length} left in this bag
            </p>
            <ScanInput
              placeholder="Scan product barcode…"
              onScan={async (raw) => {
                try {
                  const productCode = await inboundService.requireProductScan(raw)
                  const result = await inboundService.scanAssignedProduct(
                    productCode,
                    workerId,
                    isSupervisor,
                    bagLabel
                  )
                  setPending({ product: result.product, targetRack: result.targetRack })
                  setStep('scan_rack')
                  setFeedback({
                    tone: 'success',
                    title: `${result.product.sku} ready`,
                    detail: result.targetRack
                      ? `Now scan barcode for ${result.targetRack.label}${
                          result.targetRack.barcode ? ` (${result.targetRack.barcode})` : ''
                        }`
                      : 'Now scan the assigned rack',
                  })
                } catch (e) {
                  setFeedback({
                    tone: 'error',
                    title: 'Product scan failed',
                    detail: e instanceof Error ? e.message : 'Failed',
                  })
                  throw e
                }
              }}
            />
          </>
        ) : null}

        {step === 'scan_rack' && bagLabel && pending ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                3. Scan rack for{' '}
                <span className="font-mono text-primary-700">{pending.product.barcode}</span>
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="cursor-pointer text-xs font-semibold text-slate-500 hover:underline"
                  onClick={() => {
                    setPending(null)
                    setStep('scan_product')
                  }}
                >
                  Cancel product
                </button>
                <button
                  type="button"
                  className="cursor-pointer text-xs font-semibold text-slate-500 hover:underline"
                  onClick={resetBag}
                >
                  Change bag
                </button>
              </div>
            </div>
            {pending.targetRack ? (
              <p className="mb-2 text-xs text-slate-500">
                Expected:{' '}
                <span className="font-mono font-bold text-slate-800">{pending.targetRack.label}</span>
                {pending.targetRack.barcode ? (
                  <span className="ml-2 font-mono text-slate-600">
                    · scan {pending.targetRack.barcode}
                  </span>
                ) : null}
                <span className="ml-2 inline-flex align-middle">
                  <ZoneTypeBadge zone={pending.targetRack.zoneType} />
                </span>
              </p>
            ) : null}
            <ScanInput
              placeholder="Scan rack barcode…"
              onScan={async (rackScan) => {
                try {
                  const rackCode = await inboundService.requireRackScan(rackScan)
                  await inboundService.confirmPlacementOnRack(
                    pending.product.id,
                    rackCode,
                    workerId,
                    isSupervisor
                  )
                  invalidate()
                  // Refresh will update queue; decide next step from remaining in bag after place
                  const remaining = bagQueue.filter((p) => p.id !== pending.product.id)
                  setPending(null)
                  if (remaining.length === 0) {
                    setFeedback({
                      tone: 'success',
                      title: `${pending.product.sku} placed`,
                      detail: `${bagLabel} is empty — scan the next bag / trolley`,
                    })
                    setBagLabel(null)
                    setStep('scan_bag')
                  } else {
                    setFeedback({
                      tone: 'success',
                      title: `${pending.product.sku} placed`,
                      detail: `${remaining.length} left in ${bagLabel} — scan the next product`,
                    })
                    setStep('scan_product')
                  }
                } catch (e) {
                  const msg = e instanceof Error ? e.message : 'Placement failed'
                  setFeedback({
                    tone: msg === 'RACK_FULL' ? 'warn' : 'error',
                    title: msg === 'RACK_FULL' ? 'Rack is full' : 'Rack scan failed',
                    detail:
                      msg === 'RACK_FULL'
                        ? 'Ask supervisor to reassign remaining products'
                        : msg,
                  })
                  throw e
                }
              }}
            />
          </>
        ) : null}
      </div>

      {queueQ.isLoading ? <LoadingPanel label="Loading queue…" /> : null}
      <GroupedProductExpandList
        groups={byRack}
        title={
          bagLabel
            ? `${bagLabel} — ${bagQueue.length} to place`
            : `My assigned products by rack (${queue.length})`
        }
        emptyLabel={
          bagLabel
            ? 'No products left in this bag.'
            : 'No products assigned yet — supervisor must assign a bag first.'
        }
        showCarton
        showBag
        showRack
      />
    </div>
  )
}

function StepStrip(props: { step: Step }) {
  const items: { id: Step; label: string }[] = [
    { id: 'scan_bag', label: 'Bag' },
    { id: 'scan_product', label: 'Product' },
    { id: 'scan_rack', label: 'Rack' },
  ]
  const order: Step[] = ['scan_bag', 'scan_product', 'scan_rack']
  const current = order.indexOf(props.step)

  return (
    <ol className="mb-4 flex flex-wrap gap-2">
      {items.map((item, i) => {
        const done = i < current
        const active = i === current
        return (
          <li
            key={item.id}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold',
              done && 'bg-emerald-100 text-emerald-900',
              active && 'bg-primary-600 text-white',
              !done && !active && 'bg-slate-100 text-slate-500'
            )}
          >
            {done ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
            {item.label}
          </li>
        )
      })}
    </ol>
  )
}
