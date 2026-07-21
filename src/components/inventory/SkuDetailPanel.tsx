import { X } from 'lucide-react'
import { HealthBadge, SourceBadge, ZoneBadge } from '@/components/inventory/Badges'
import { formatMoney } from '@/lib/cn'
import { useRestockStore } from '@/store/useRestockStore'
import type { SkuInventoryRow } from '@/types/inventory'
import { needsSellerUpdate } from '@/types/inventory'

export function SkuDetailPanel({
  sku,
  onClose,
  onNotifySeller,
}: {
  sku: SkuInventoryRow
  onClose: () => void
  onNotifySeller?: (sku: SkuInventoryRow) => void
}) {
  const requested = useRestockStore((s) => s.hasPendingRequest(sku.sku))
  const request = useRestockStore((s) => s.getRequestForSku(sku.sku))
  const canNotify = needsSellerUpdate(sku.health)

  return (
    <aside className="surface-panel flex max-h-[calc(100vh-8rem)] w-full flex-col overflow-hidden lg:w-[420px]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-700">{sku.brandName}</p>
          <h2 className="font-heading truncate text-lg text-slate-900">{sku.name}</h2>
          <p className="mt-0.5 font-mono text-xs text-slate-500">{sku.sku}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto p-4 scrollbar-thin">
        <div className="flex flex-wrap items-center gap-2">
          <HealthBadge health={sku.health} />
          <SourceBadge source={sku.source} />
          {requested ? (
            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
              Seller notified
            </span>
          ) : null}
        </div>

        {canNotify ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-sm font-semibold text-amber-950">Stock needs seller update</p>
            <p className="mt-1 text-xs text-amber-900/80">
              Available units are at or below the reorder point. Ask the seller to replenish inventory.
            </p>
            {requested && request ? (
              <p className="mt-2 text-xs font-medium text-amber-800">
                Requested {new Date(request.createdAt).toLocaleString()}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => onNotifySeller?.(sku)}
                className="mt-3 w-full rounded-xl bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-700"
              >
                Notify seller to update inventory
              </button>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Metric label="On hand" value={sku.onHand} />
          <Metric label="Available" value={sku.available} />
          <Metric label="Reserved" value={sku.reserved} />
          <Metric label="Incoming" value={sku.incoming} />
          <Metric label="Reorder at" value={sku.reorderPoint} />
          <Metric label="Unit value" value={formatMoney(sku.unitValue)} />
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">Barcode:</span> {sku.barcode}
          </p>
          {sku.asin ? (
            <p className="mt-1">
              <span className="font-semibold text-slate-800">ASIN:</span> {sku.asin}
            </p>
          ) : null}
          {sku.fnsku ? (
            <p className="mt-1">
              <span className="font-semibold text-slate-800">FNSKU:</span> {sku.fnsku}
            </p>
          ) : null}
        </div>

        <section>
          <h3 className="mb-2 text-sm font-bold text-slate-800">Locations ({sku.locationCount})</h3>
          {sku.locations.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">
              Not yet put away in warehouse locations.
              {sku.incoming > 0 ? ` ${sku.incoming} unit(s) incoming.` : ''}
            </p>
          ) : (
            <ul className="space-y-2">
              {sku.locations.map((loc, i) => (
                <li key={`${loc.binrackId}-${i}`} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-900">{loc.locationCode}</span>
                    <ZoneBadge zone={loc.zoneType} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{loc.hierarchyLabel}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                    <span>
                      Qty <strong>{loc.quantity}</strong>
                    </span>
                    <span>
                      Avail <strong>{loc.available}</strong>
                    </span>
                    <span>
                      Status <strong>{loc.status}</strong>
                    </span>
                    {loc.batchNo ? (
                      <span>
                        Batch <strong>{loc.batchNo}</strong>
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
    </div>
  )
}
