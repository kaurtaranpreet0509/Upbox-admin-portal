import { X } from 'lucide-react'
import { ZoneBadge } from '@/components/inventory/Badges'
import { brands } from '@/data/mockInventory'
import type { MapShelf } from '@/lib/warehouseMap'
import { ZONE_LABELS } from '@/types/inventory'

export function LocationDetailPanel({
  shelf,
  onClose,
}: {
  shelf: MapShelf
  onClose: () => void
}) {
  const loc = shelf.location
  const brandName = loc.brandId ? brands.find((b) => b.id === loc.brandId)?.name : null
  const locationType =
    loc.locationKind === 'carton_staging' ? 'Carton staging bay' : 'Product shelf'

  return (
    <aside className="surface-panel flex max-h-[calc(100vh-8rem)] w-full flex-col overflow-hidden lg:w-[400px]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-700">Location details</p>
          <h2 className="font-heading font-mono text-lg text-slate-900">{loc.locationCode}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{loc.hierarchyLabels.join(' › ')}</p>
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
        <div className="flex flex-wrap gap-2">
          <ZoneBadge zone={loc.zoneType} />
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {locationType}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Detail label="Zone" value={ZONE_LABELS[loc.zoneType]} />
          <Detail label="Type" value={locationType} />
          <Detail label="Units" value={loc.filledUnits} />
          <Detail label="SKUs" value={shelf.skuCount} />
          <Detail label="Fill" value={`${shelf.displayFillPercent.toFixed(1)}%`} />
          <Detail label="Capacity" value={loc.maxUnits} />
          <Detail label="Brand" value={brandName ?? 'Unassigned'} />
          <Detail label="Lines" value={loc.lineItems.length} />
        </div>

        <section>
          <h3 className="mb-2 text-sm font-bold text-slate-800">Products</h3>
          {loc.lineItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-500">
              {loc.locationKind === 'carton_staging'
                ? 'No product lines — cartons stage here before putaway.'
                : 'This shelf is empty.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {loc.lineItems.map((li) => (
                <li key={li.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{li.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {li.sku} · {li.barcode}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                      {li.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                    <span>
                      Type <strong>{locationType}</strong>
                    </span>
                    <span>
                      Qty <strong>{li.quantity}</strong>
                    </span>
                    {li.batchNo ? (
                      <span>
                        Batch <strong>{li.batchNo}</strong>
                      </span>
                    ) : null}
                    <span>
                      Brand{' '}
                      <strong>{brands.find((b) => b.id === li.brandId)?.name ?? li.brandId}</strong>
                    </span>
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

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
    </div>
  )
}
