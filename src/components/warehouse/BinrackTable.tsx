import { PackageSearch, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { BinrackRow } from '@/types/inbound'
import { CapacityFillPill, CartonStatusBadge, ZoneTypeBadge } from '@/components/common/Badges'
import { brands } from '@/data/mockInbound'
import { cn } from '@/lib/cn'

export function BinrackTable(props: {
  rows: BinrackRow[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const [contentsRow, setContentsRow] = useState<BinrackRow | null>(null)

  return (
    <div className="surface-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Type / groups</th>
              <th className="px-4 py-3">Capacity / fill</th>
              <th className="px-4 py-3">Contents</th>
              <th className="px-4 py-3">Products</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {props.rows.map((row) => {
              const isStaging = row.locationKind === 'carton_staging'
              const hasContents = isStaging
                ? row.stagedCartons.length > 0
                : row.lineItems.length > 0
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'cursor-default transition hover:bg-indigo-50/40',
                    props.selectedId === row.id && 'bg-sky-50'
                  )}
                  onClick={() => props.onSelect(props.selectedId === row.id ? null : row.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ZoneTypeBadge zone={row.zoneType} />
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {row.locationCode}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {isStaging ? (
                      <div>
                        <div className="text-xs font-semibold text-amber-800">Carton floor / pallet bay</div>
                        <div className="text-xs text-slate-500">
                          {row.storageGroups.length ? row.storageGroups.join(', ') : 'Dock staging'}
                        </div>
                      </div>
                    ) : (
                      row.storageGroups.length ? row.storageGroups.join(', ') : '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isStaging ? (
                        <span className="font-mono text-xs text-slate-600">
                          {row.maxUnits} carton slots · bay {row.capacity.w}×{row.capacity.h}×
                          {row.capacity.d}m
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-600">
                          {row.capacity.w} x {row.capacity.h} x {row.capacity.d}
                        </span>
                      )}
                      <CapacityFillPill percent={row.fillPercent} />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {isStaging
                      ? `${row.stagedCartons.length} carton${row.stagedCartons.length === 1 ? '' : 's'}`
                      : `${row.skuCount} SKUs x ${row.itemQty}`}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={!hasContents}
                      onClick={(e) => {
                        e.stopPropagation()
                        setContentsRow(row)
                      }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <PackageSearch className="h-3.5 w-3.5" />
                      {isStaging ? 'View cartons' : 'View products'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {props.rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">No locations match your filters.</p>
      ) : null}

      {contentsRow ? (
        <RackContentsModal row={contentsRow} onClose={() => setContentsRow(null)} />
      ) : null}
    </div>
  )
}

function RackContentsModal(props: { row: BinrackRow; onClose: () => void }) {
  const isStaging = props.row.locationKind === 'carton_staging'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [props.onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <ZoneTypeBadge zone={props.row.zoneType} />
              <h3 className="font-heading text-lg text-slate-900">{props.row.locationCode}</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {isStaging
                ? `${props.row.stagedCartons.length} staged carton(s)`
                : `${props.row.lineItems.length} product line(s) · ${props.row.itemQty} units`}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isStaging ? <StagedCartonsList row={props.row} /> : <ProductsList row={props.row} />}
        </div>
      </div>
    </div>
  )
}

function ProductsList(props: { row: BinrackRow }) {
  if (props.row.lineItems.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No products in this rack.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2.5">Product</th>
            <th className="px-3 py-2.5">SKU</th>
            <th className="px-3 py-2.5">Barcode</th>
            <th className="px-3 py-2.5">Qty</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Brand</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {props.row.lineItems.map((li) => {
            const brand = brands.find((b) => b.id === li.brandId)
            return (
              <tr key={li.id} className="hover:bg-slate-50/80">
                <td className="px-3 py-3">
                  <div className="font-semibold text-slate-900">{li.name}</div>
                  {li.batchNo ? (
                    <div className="text-[11px] text-slate-500">Batch {li.batchNo}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-mono text-xs font-semibold text-sky-700">{li.sku}</td>
                <td className="px-3 py-3">
                  <span className="rounded-md bg-sky-50 px-2 py-1 font-mono text-xs font-bold text-sky-900 ring-1 ring-sky-200">
                    {li.barcode}
                  </span>
                </td>
                <td className="px-3 py-3 font-semibold text-slate-800">{li.quantity}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {li.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">{brand?.name ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StagedCartonsList(props: { row: BinrackRow }) {
  if (props.row.stagedCartons.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No cartons staged.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2.5">Carton</th>
            <th className="px-3 py-2.5">Barcode</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Products</th>
            <th className="px-3 py-2.5">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {props.row.stagedCartons.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50/80">
              <td className="px-3 py-3 font-semibold text-sky-700">{c.id}</td>
              <td className="px-3 py-3">
                <span className="rounded-md bg-sky-50 px-2 py-1 font-mono text-xs font-bold text-sky-900 ring-1 ring-sky-200">
                  {c.barcode}
                </span>
              </td>
              <td className="px-3 py-3">
                <CartonStatusBadge status={c.status} />
              </td>
              <td className="px-3 py-3">{c.productCount}</td>
              <td className="px-3 py-3 text-xs text-slate-600">
                {c.receivedAt ? new Date(c.receivedAt).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
