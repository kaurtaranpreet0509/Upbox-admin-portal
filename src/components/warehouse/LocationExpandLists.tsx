import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { BinrackRow, MasterCarton, ProductStatus, ProductUnit } from '@/types/inbound'
import { CapacityFillPill, CartonStatusBadge, ZoneTypeBadge } from '@/components/common/Badges'
import { ProductMiniTable } from '@/components/common/ExpandLists'
import { brands, rackSlots, workers } from '@/data/mockInbound'
import { inboundService } from '@/services/inbound.service'
import { cn } from '@/lib/cn'

export { TrolleyExpandList } from '@/components/common/ExpandLists'

type TrolleyBag = {
  label: string
  productCount: number
  cartonIds: string[]
  products: Array<
    ProductUnit & {
      cartonId: string
      cartonBarcode: string
    }
  >
}

export function LocationsTrolleyExpandList(props: {
  bags: TrolleyBag[]
  emptyLabel?: string
  selectedLabel?: string | null
  onSelect?: (label: string | null) => void
}) {
  const [openLabel, setOpenLabel] = useState<string | null>(null)

  if (props.bags.length === 0) {
    return <Empty label={props.emptyLabel ?? 'No bags or trolleys yet.'} />
  }

  return (
    <div className="surface-panel divide-y divide-slate-100 overflow-hidden">
      {props.bags.map((bag) => {
        const open = openLabel === bag.label
        const empty = bag.productCount === 0
        const skuCount = new Set(bag.products.map((p) => p.sku)).size
        const fillPercent = empty ? 0 : Math.min(100, (bag.productCount / 20) * 100)
        const kind = bag.label.toLowerCase().startsWith('trolley') ? 'Trolley' : 'Bag'
        const brandNames = [
          ...new Set(
            bag.products
              .map((p) => brands.find((b) => b.id === p.brandId)?.name)
              .filter(Boolean) as string[]
          ),
        ]
        const staged = bag.products.filter((p) => p.status === 'STAGED').length
        const assigned = bag.products.filter((p) => p.status === 'ASSIGNED').length
        const selected = props.selectedLabel === bag.label

        return (
          <div key={bag.label}>
            <button
              type="button"
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50',
                selected && 'bg-sky-50'
              )}
              onClick={() => {
                props.onSelect?.(selected ? null : bag.label)
                setOpenLabel(open ? null : bag.label)
              }}
            >
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-900">
                {kind}
              </span>
              <span className="font-mono text-sm font-bold text-slate-900">{bag.label}</span>
              {empty ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-500">
                  Empty
                </span>
              ) : (
                <span className="text-sm text-slate-600">
                  {skuCount} SKUs · {bag.productCount} units · {bag.cartonIds.length} carton
                  {bag.cartonIds.length === 1 ? '' : 's'}
                </span>
              )}
              {!empty && brandNames.length > 0 ? (
                <span className="hidden text-xs text-slate-500 sm:inline">
                  {brandNames.join(', ')}
                </span>
              ) : null}
              {!empty ? (
                <span className="hidden text-xs text-slate-500 lg:inline">
                  {staged > 0 ? `${staged} staged` : null}
                  {staged > 0 && assigned > 0 ? ' · ' : null}
                  {assigned > 0 ? `${assigned} assigned` : null}
                </span>
              ) : null}
              <span className="ml-auto shrink-0">
                <CapacityFillPill percent={fillPercent} />
              </span>
            </button>

            {open ? (
              <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 pl-12">
                {empty ? (
                  <p className="py-4 text-sm text-slate-500">
                    Empty — scan this label during unpack to fill it.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Barcode</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Brand</th>
                          <th className="px-3 py-2">Carton</th>
                          <th className="px-3 py-2">Rack</th>
                          <th className="px-3 py-2">Worker</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bag.products.map((p) => {
                          const rack =
                            rackSlots.find((r) => r.id === p.assignedRackSlotId)?.label ?? null
                          const worker =
                            workers.find((w) => w.id === p.assignedWorkerId)?.name ?? null
                          return (
                            <tr key={p.id}>
                              <td className="px-3 py-2.5 font-semibold text-slate-900">
                                {p.description}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs text-sky-700">{p.sku}</td>
                              <td className="px-3 py-2.5 font-mono text-xs">{p.barcode}</td>
                              <td className="px-3 py-2.5">
                                <TrolleyStatusPill status={p.status} />
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {brands.find((b) => b.id === p.brandId)?.name ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                                {p.cartonId}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs font-bold text-emerald-800">
                                {rack ?? '—'}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">{worker ?? '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function TrolleyStatusPill({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
        status === 'PENDING' && 'bg-slate-100 text-slate-700',
        status === 'STAGED' && 'bg-emerald-100 text-emerald-800',
        status === 'ASSIGNED' && 'bg-sky-100 text-sky-800',
        status === 'PLACED' && 'bg-violet-100 text-violet-800',
        status === 'DAMAGED' && 'bg-rose-100 text-rose-800'
      )}
    >
      {status.toLowerCase()}
    </span>
  )
}

export function GoodsInExpandList(props: {
  rows: BinrackRow[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [openBayId, setOpenBayId] = useState<string | null>(null)
  const [openCartonId, setOpenCartonId] = useState<string | null>(null)
  const [cartonDetail, setCartonDetail] = useState<MasterCarton | null>(null)
  const [loadingCarton, setLoadingCarton] = useState(false)

  useEffect(() => {
    if (!openCartonId) {
      setCartonDetail(null)
      return
    }
    let cancelled = false
    setLoadingCarton(true)
    void inboundService.getCarton(openCartonId).then((c) => {
      if (!cancelled) {
        setCartonDetail(c)
        setLoadingCarton(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [openCartonId])

  const bays = props.rows.filter(
    (r) => r.locationKind === 'carton_staging' || r.zoneType === 'goods_in'
  )

  if (bays.length === 0) {
    return <Empty label="No Goods In bays match." />
  }

  return (
    <div className="surface-panel divide-y divide-slate-100 overflow-hidden">
      {bays.map((bay) => {
        const open = openBayId === bay.id
        return (
          <div key={bay.id}>
            <button
              type="button"
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50',
                props.selectedId === bay.id && 'bg-sky-50'
              )}
              onClick={() => {
                props.onSelect(props.selectedId === bay.id ? null : bay.id)
                setOpenBayId(open ? null : bay.id)
                setOpenCartonId(null)
              }}
            >
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <ZoneTypeBadge zone={bay.zoneType} />
              <span className="font-mono text-sm font-bold text-slate-900">{bay.locationCode}</span>
              <span className="text-sm text-slate-600">
                {bay.stagedCartons.length} carton{bay.stagedCartons.length === 1 ? '' : 's'}
              </span>
              <span className="ml-auto">
                <CapacityFillPill percent={bay.fillPercent} />
              </span>
            </button>

            {open ? (
              <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 pl-12">
                {bay.stagedCartons.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">No cartons on this bay.</p>
                ) : (
                  <ul className="space-y-2">
                    {bay.stagedCartons.map((c) => {
                      const cartonOpen = openCartonId === c.id
                      return (
                        <li key={c.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <button
                            type="button"
                            className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                            onClick={() => setOpenCartonId(cartonOpen ? null : c.id)}
                          >
                            {cartonOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span className="font-semibold text-sky-800">{c.id}</span>
                            <span className="font-mono text-xs text-slate-500">{c.barcode}</span>
                            <CartonStatusBadge status={c.status} />
                            <span className="ml-auto text-xs text-slate-500">
                              {c.productCount} products
                            </span>
                          </button>
                          {cartonOpen ? (
                            <div className="border-t border-slate-100 px-3 py-3">
                              {loadingCarton ? (
                                <p className="text-sm text-slate-500">Loading products…</p>
                              ) : (
                                <ProductMiniTable products={cartonDetail?.products ?? []} showBag />
                              )}
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function BinrackExpandList(props: {
  rows: BinrackRow[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const racks = props.rows.filter((r) => r.zoneType === 'pick')

  if (racks.length === 0) {
    return <Empty label="No binracks match." />
  }

  return (
    <div className="surface-panel divide-y divide-slate-100 overflow-hidden">
      {racks.map((row) => {
        const open = openId === row.id
        return (
          <div key={row.id}>
            <button
              type="button"
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50',
                props.selectedId === row.id && 'bg-sky-50'
              )}
              onClick={() => {
                props.onSelect(props.selectedId === row.id ? null : row.id)
                setOpenId(open ? null : row.id)
              }}
            >
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="font-mono text-sm font-bold text-slate-900">{row.locationCode}</span>
              {row.scanBarcode ? (
                <span className="font-mono text-xs text-slate-500">{row.scanBarcode}</span>
              ) : null}
              <span className="text-sm text-slate-600">
                {row.skuCount} SKUs · {row.itemQty} units
              </span>
              <span className="ml-auto">
                <CapacityFillPill percent={row.fillPercent} />
              </span>
            </button>
            {open ? (
              <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 pl-12">
                {row.lineItems.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">No products on this rack.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Barcode</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Brand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {row.lineItems.map((li) => (
                          <tr key={li.id}>
                            <td className="px-3 py-2.5 font-semibold text-slate-900">{li.name}</td>
                            <td className="px-3 py-2.5 font-mono text-xs text-sky-700">{li.sku}</td>
                            <td className="px-3 py-2.5 font-mono text-xs">{li.barcode}</td>
                            <td className="px-3 py-2.5 font-semibold">{li.quantity}</td>
                            <td className="px-3 py-2.5 text-xs font-semibold text-slate-600">
                              {li.status}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {brands.find((b) => b.id === li.brandId)?.name ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function InspectionExpandList(props: {
  rows: BinrackRow[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = props.rows.filter(
    (r) => r.zoneType === 'inspection' || r.locationKind === 'inspection_hold'
  )

  if (rows.length === 0) {
    return <Empty label="No inspection locations." />
  }

  return (
    <div className="surface-panel divide-y divide-slate-100 overflow-hidden">
      {rows.map((row) => {
        const open = openId === row.id
        const damagedQty = row.lineItems
          .filter((li) => li.status === 'Damaged')
          .reduce((s, li) => s + li.quantity, 0)
        return (
          <div key={row.id}>
            <button
              type="button"
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50',
                props.selectedId === row.id && 'bg-sky-50'
              )}
              onClick={() => {
                props.onSelect(props.selectedId === row.id ? null : row.id)
                setOpenId(open ? null : row.id)
              }}
            >
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-sm font-bold text-violet-900 ring-1 ring-violet-200">
                {row.locationCode}
              </span>
              <span className="text-sm text-slate-600">
                {damagedQty} damaged unit{damagedQty === 1 ? '' : 's'}
              </span>
              <span className="ml-auto text-xs text-slate-500">
                {row.storageGroups.join(', ') || 'QA hold'}
              </span>
            </button>
            {open ? (
              <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 pl-12">
                {row.lineItems.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">
                    No damaged products here yet — unpacker sends them from the carton.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Barcode</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {row.lineItems.map((li) => (
                          <tr key={li.id}>
                            <td className="px-3 py-2.5 font-semibold text-slate-900">{li.name}</td>
                            <td className="px-3 py-2.5 font-mono text-xs text-sky-700">{li.sku}</td>
                            <td className="px-3 py-2.5 font-mono text-xs">{li.barcode}</td>
                            <td className="px-3 py-2.5 font-semibold">{li.quantity}</td>
                            <td className="px-3 py-2.5">
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                                {li.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function Empty(props: { label: string }) {
  return (
    <div className="surface-panel px-4 py-10 text-center text-sm text-slate-500">{props.label}</div>
  )
}

