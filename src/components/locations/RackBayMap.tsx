import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fillBandClass, shelfMatchesSearch, type MapRack, type MapShelf } from '@/lib/warehouseMap'
import { ZONE_LABELS } from '@/types/inventory'

export function RackBayMap({
  rack,
  search,
  selectedShelfId,
  onSelectShelf,
  onBack,
}: {
  rack: MapRack
  search: string
  selectedShelfId: string | null
  onSelectShelf: (shelf: MapShelf) => void
  onBack: () => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200/70 p-4 shadow-inner">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to floor
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Rack detail</p>
          <h2 className="font-heading text-lg text-slate-900">{rack.label}</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {rack.zoneLabel} › {rack.aisleLabel} · {rack.shelfCount} shelves · {rack.filledUnits} units
          </p>
        </div>
        <p className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">
          Click a <strong>bay</strong> column or a <strong>shelf</strong> cell for products
        </p>
      </div>

      <div className="flex min-w-[560px] gap-4 overflow-x-auto pb-2">
        {rack.bays.map((bay) => (
          <div
            key={bay.id}
            className="flex min-w-[160px] flex-1 flex-col rounded-xl border border-slate-300 bg-white/80 p-3 shadow-sm"
          >
            <div className={cn('mb-3 rounded-lg border px-2.5 py-2', fillBandClass(bay.fillBand))}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Bay</p>
              <p className="font-heading text-sm">{bay.label}</p>
              <p className="mt-1 text-[11px]">
                {bay.shelves.length} shelf{bay.shelves.length === 1 ? '' : 's'} · {bay.filledUnits} units ·{' '}
                {bay.skuCount} SKUs
              </p>
              <p className="text-[10px] font-semibold">{bay.displayFillPercent.toFixed(0)}% fill</p>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              {bay.shelves.map((shelf, index) => {
                const loc = shelf.location
                const match = shelfMatchesSearch(shelf, search)
                const selected = selectedShelfId === shelf.id
                const dimmed = !!search.trim() && !match
                return (
                  <button
                    key={shelf.id}
                    type="button"
                    onClick={() => onSelectShelf(shelf)}
                    className={cn(
                      'rounded-lg border-2 p-2.5 text-left transition',
                      fillBandClass(shelf.fillBand),
                      selected && 'ring-2 ring-primary-500 ring-offset-2',
                      dimmed && 'opacity-35',
                      match && search.trim() && 'ring-2 ring-sky-400 ring-offset-1',
                      'hover:shadow-md'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                          Shelf {bay.shelves.length - index}
                        </p>
                        <p className="font-mono text-sm font-bold">{loc.locationCode}</p>
                      </div>
                      <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        {ZONE_LABELS[loc.zoneType]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] opacity-90">
                      {loc.locationKind === 'carton_staging' ? 'Carton staging' : 'Product shelf'} ·{' '}
                      {shelf.skuCount} SKU{shelf.skuCount === 1 ? '' : 's'} · {loc.filledUnits} units
                    </p>
                    {loc.lineItems[0] ? (
                      <p className="mt-1 truncate text-[11px] font-medium">
                        {loc.lineItems[0].name}
                        {loc.lineItems.length > 1 ? ` +${loc.lineItems.length - 1}` : ''}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] italic opacity-60">Empty</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
