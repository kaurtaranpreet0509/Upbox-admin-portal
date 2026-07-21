import { useMemo, useState } from 'react'
import { Check, Package, Search, Warehouse } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { ScanInput } from '@/components/common/ScanInput'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { CapacityFillPill } from '@/components/common/Badges'
import {
  useAssignStagedProducts,
  useBrands,
  useRacks,
  useStagedProducts,
  useWorkers,
} from '@/hooks/useInbound'
import { inboundService } from '@/services/inbound.service'
import { cn } from '@/lib/cn'
import type { RackSlot, WarehouseWorker } from '@/types/inbound'

type Step = 'bag' | 'rack'

/** All putaway workers treated as on-shift — pick least loaded. */
function autoPickWorker(workers: WarehouseWorker[]): WarehouseWorker | null {
  const pool = workers.filter((w) => w.role === 'PUTAWAY')
  if (pool.length === 0) return null
  return [...pool].sort(
    (a, b) => a.openProductCount - b.openProductCount || a.name.localeCompare(b.name)
  )[0]!
}

export function AssignPutawayPage() {
  const stagedQ = useStagedProducts()
  const workersQ = useWorkers()
  const racksQ = useRacks()
  const brandsQ = useBrands()
  const assignMut = useAssignStagedProducts()

  const [step, setStep] = useState<Step>('bag')
  const [bagLabel, setBagLabel] = useState<string | null>(null)
  const [workerId, setWorkerId] = useState('')
  const [rackSlotId, setRackSlotId] = useState('')
  const [bagSearch, setBagSearch] = useState('')
  const [rackSearch, setRackSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const brandName = (id: string | null | undefined) =>
    brandsQ.data?.find((b) => b.id === id)?.name ?? 'Any brand'

  const putawayWorkers = useMemo(
    () => (workersQ.data ?? []).filter((w) => w.role === 'PUTAWAY'),
    [workersQ.data]
  )

  const placeRacks = useMemo(
    () => (racksQ.data ?? []).filter((r) => r.zoneType === 'pick'),
    [racksQ.data]
  )

  const rows = stagedQ.data ?? []

  const readyBags = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string
        products: typeof rows
        cartonIds: Set<string>
        brandIds: Set<string>
      }
    >()
    for (const p of rows) {
      const label = p.stagingContainerLabel?.trim()
      if (!label) continue
      let bag = map.get(label)
      if (!bag) {
        bag = { label, products: [], cartonIds: new Set(), brandIds: new Set() }
        map.set(label, bag)
      }
      bag.products.push(p)
      bag.cartonIds.add(p.cartonId)
      bag.brandIds.add(p.brandId)
    }
    return [...map.values()]
      .map((b) => ({
        label: b.label,
        productCount: b.products.length,
        skuCount: new Set(b.products.map((p) => p.sku)).size,
        cartonCount: b.cartonIds.size,
        brands: [...b.brandIds].map((id) => brandName(id)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [rows, brandsQ.data])

  const bagProducts = useMemo(() => {
    if (!bagLabel) return []
    const q = bagLabel.trim().toLowerCase()
    return rows.filter((p) => (p.stagingContainerLabel ?? '').trim().toLowerCase() === q)
  }, [rows, bagLabel])

  const filteredBags = useMemo(() => {
    const q = bagSearch.trim().toLowerCase()
    if (!q) return readyBags
    return readyBags.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.brands.some((name) => name.toLowerCase().includes(q))
    )
  }, [readyBags, bagSearch])

  const filteredRacks = useMemo(() => {
    const q = rackSearch.trim().toLowerCase()
    if (!q) return placeRacks
    return placeRacks.filter((r) => {
      const brand =
        brandsQ.data?.find((b) => b.id === r.brandId)?.name?.toLowerCase() ?? ''
      return (
        r.label.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.barcode?.toLowerCase().includes(q) ?? false) ||
        brand.includes(q)
      )
    })
  }, [placeRacks, rackSearch, brandsQ.data])

  const selectedWorker = putawayWorkers.find((w) => w.id === workerId) ?? null
  const selectedRack = placeRacks.find((r) => r.id === rackSlotId) ?? null

  const resetFlow = () => {
    setStep('bag')
    setBagLabel(null)
    setWorkerId('')
    setRackSlotId('')
    setBagSearch('')
    setRackSearch('')
    setError(null)
  }

  const selectBag = (label: string) => {
    setError(null)
    const worker = autoPickWorker(putawayWorkers)
    if (!worker) {
      setError('No putaway workers available')
      return
    }
    setBagLabel(label)
    setWorkerId(worker.id)
    setRackSlotId('')
    setStep('rack')
  }

  const onScanBag = async (raw: string) => {
    setError(null)
    const label = await inboundService.requireBagScan(raw)
    const q = label.toLowerCase()
    const products = rows.filter(
      (p) => (p.stagingContainerLabel ?? '').trim().toLowerCase() === q
    )
    if (products.length === 0) {
      const msg = `No staged products in “${label}”. Unpack into this bag first.`
      setError(msg)
      throw new Error(msg)
    }
    selectBag(products[0]!.stagingContainerLabel!.trim())
  }

  const onAssign = async () => {
    setError(null)
    if (!bagLabel || !workerId || !rackSlotId) return
    const rack = placeRacks.find((r) => r.id === rackSlotId)
    if (!rack) {
      setError('Select a rack')
      return
    }
    const left = Math.max(0, rack.capacity - rack.filled)
    if (bagProducts.length > left) {
      setError(
        `Rack ${rack.label} only has ${left} product slot${left === 1 ? '' : 's'} left — bag has ${bagProducts.length}.`
      )
      return
    }
    try {
      const count = await assignMut.mutateAsync({
        productIds: bagProducts.map((p) => p.id),
        workerId,
        rackSlotId,
      })
      const name = selectedWorker?.name ?? 'worker'
      setToast(`Assigned ${count} from ${bagLabel} → ${name} · ${rack.label}`)
      setTimeout(() => setToast(null), 2800)
      resetFlow()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign failed')
    }
  }

  return (
    <div>
      <PageHeader title="Assign putaway" />

      <StepStrip step={step} />

      <p className="mb-4 text-sm text-slate-600">
        Workers are auto-assigned (all treated as on shift — least busy putaway worker first). You
        only pick the bag and the rack.
      </p>

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

      {stagedQ.isLoading ? <LoadingPanel label="Loading staged products…" /> : null}

      {step === 'bag' ? (
        <section className="surface-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-700" />
            <h2 className="font-heading text-lg text-slate-900">1. Scan or choose bag / trolley</h2>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Scan a label, or pick a bag below. A putaway worker is assigned automatically.
          </p>
          <ScanInput
            placeholder="Scan bag / trolley label then Enter…"
            onScan={onScanBag}
            autoFocus
          />

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={bagSearch}
              onChange={(e) => setBagSearch(e.target.value)}
              placeholder="Search bags ready to assign…"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm"
            />
          </div>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bags ready to assign ({filteredBags.length})
          </p>

          <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
            {filteredBags.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                {readyBags.length === 0
                  ? 'Nothing staged yet — unpacker must scan products into a bag first.'
                  : 'No bags match your search.'}
              </li>
            ) : (
              filteredBags.map((bag) => (
                <li key={bag.label}>
                  <button
                    type="button"
                    onClick={() => selectBag(bag.label)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-amber-300 hover:bg-amber-50/60"
                  >
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-mono text-sm font-bold text-amber-950 ring-1 ring-amber-200">
                      {bag.label}
                    </span>
                    <span className="text-sm text-slate-600">
                      {bag.productCount} product{bag.productCount === 1 ? '' : 's'} · {bag.skuCount}{' '}
                      SKU{bag.skuCount === 1 ? '' : 's'} · {bag.cartonCount} carton
                      {bag.cartonCount === 1 ? '' : 's'}
                    </span>
                    {bag.brands.length > 0 ? (
                      <span className="ml-auto hidden text-xs text-slate-500 sm:inline">
                        {bag.brands.join(', ')}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {step === 'rack' && bagLabel && selectedWorker ? (
        <section className="surface-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-emerald-700" />
              <h2 className="font-heading text-lg text-slate-900">2. Assign pick rack</h2>
            </div>
            <button
              type="button"
              onClick={resetFlow}
              className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Change bag
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-mono text-xs font-bold text-amber-950 ring-1 ring-amber-200">
              {bagLabel}
            </span>
            <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-900 ring-1 ring-sky-200">
              Auto → {selectedWorker.name}
            </span>
            <span className="self-center text-xs text-slate-500">
              {bagProducts.length} product{bagProducts.length === 1 ? '' : 's'} ·{' '}
              {selectedWorker.openProductCount} open on worker
            </span>
          </div>

          <BagSummary label={bagLabel} products={bagProducts} brandName={brandName} />

          <div className="mt-4">
            <ScanInput
              placeholder="Scan rack barcode…"
              autoFocus
              onScan={async (raw) => {
                try {
                  setError(null)
                  const rackLabel = await inboundService.requireRackScan(raw)
                  const rack = placeRacks.find(
                    (r) => r.label.toUpperCase() === rackLabel.toUpperCase()
                  )
                  if (!rack) {
                    throw new Error('Rack not found in pick list')
                  }
                  setRackSlotId(rack.id)
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Rack scan failed')
                  throw e
                }
              }}
            />
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={rackSearch}
              onChange={(e) => setRackSearch(e.target.value)}
              placeholder="Or search rack by code or brand…"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm"
            />
          </div>

          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {filteredRacks.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No racks match.
              </li>
            ) : (
              filteredRacks.map((r) => {
                const left = Math.max(0, r.capacity - r.filled)
                const fits = bagProducts.length <= left
                return (
                  <RackRow
                    key={r.id}
                    rack={r}
                    brand={brandName(r.brandId)}
                    selected={rackSlotId === r.id}
                    fits={fits}
                    need={bagProducts.length}
                    onSelect={() => setRackSlotId(r.id)}
                  />
                )
              })
            )}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            {selectedRack ? (
              <p className="text-sm text-slate-600">
                Selected <span className="font-mono font-bold">{selectedRack.label}</span> —{' '}
                {selectedRack.filled} used ·{' '}
                {Math.max(0, selectedRack.capacity - selectedRack.filled)} left
              </p>
            ) : (
              <p className="text-sm text-slate-500">Choose a rack from the list.</p>
            )}
            <button
              type="button"
              disabled={!rackSlotId || assignMut.isPending}
              onClick={() => void onAssign()}
              className="ml-auto cursor-pointer rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {assignMut.isPending
                ? 'Assigning…'
                : `Assign ${bagProducts.length} product${bagProducts.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function StepStrip(props: { step: Step }) {
  const items: { id: Step; label: string }[] = [
    { id: 'bag', label: 'Bag' },
    { id: 'rack', label: 'Rack' },
  ]
  const order: Step[] = ['bag', 'rack']
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

function BagSummary(props: {
  label: string
  products: Array<{ sku: string; description: string; brandId: string }>
  brandName: (id: string) => string
}) {
  const skus = new Set(props.products.map((p) => p.sku)).size
  const brands = [...new Set(props.products.map((p) => props.brandName(p.brandId)))]
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm">
      <div className="font-mono text-base font-bold text-amber-950">{props.label}</div>
      <div className="mt-1 text-slate-700">
        {props.products.length} product{props.products.length === 1 ? '' : 's'} · {skus} SKU
        {skus === 1 ? '' : 's'}
        {brands.length > 0 ? ` · ${brands.join(', ')}` : ''}
      </div>
    </div>
  )
}

function RackRow(props: {
  rack: RackSlot
  brand: string
  selected: boolean
  fits: boolean
  need: number
  onSelect: () => void
}) {
  const left = Math.max(0, props.rack.capacity - props.rack.filled)
  const fillPercent =
    props.rack.capacity > 0
      ? Number(((props.rack.filled / props.rack.capacity) * 100).toFixed(2))
      : 0

  return (
    <li>
      <button
        type="button"
        onClick={props.onSelect}
        className={cn(
          'flex w-full cursor-pointer flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:bg-emerald-50/60',
          props.selected
            ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
            : 'border-slate-200 bg-white',
          !props.fits && 'opacity-70'
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900">{props.rack.label}</span>
            <span className="text-xs text-slate-500">{props.brand}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
              {props.rack.status.replaceAll('_', ' ').toLowerCase()}
            </span>
          </div>
          {props.rack.barcode ? (
            <p className="mt-0.5 font-mono text-xs text-slate-500">Scan: {props.rack.barcode}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
            <span>
              <span className="font-semibold">{props.rack.filled}</span> used
            </span>
            <span>
              <span className="font-semibold text-emerald-800">{left}</span> left
            </span>
            <span className="text-xs text-slate-500">of {props.rack.capacity} products</span>
            {!props.fits ? (
              <span className="text-xs font-semibold text-rose-700">
                Need {props.need} — not enough space
              </span>
            ) : null}
          </div>
        </div>
        <CapacityFillPill percent={fillPercent} />
        {props.selected ? <Check className="h-4 w-4 shrink-0 text-emerald-700" /> : null}
      </button>
    </li>
  )
}
