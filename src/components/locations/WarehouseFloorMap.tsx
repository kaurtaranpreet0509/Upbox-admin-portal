import { cn } from '@/lib/cn'
import {
  fillBandClass,
  rackMatchesSearch,
  type MapAisle,
  type MapRack,
  type WarehouseMap,
} from '@/lib/warehouseMap'
import { ZONE_LABELS } from '@/types/inventory'

export function WarehouseFloorMap({
  map,
  search,
  selectedRackId,
  onSelectRack,
}: {
  map: WarehouseMap
  search: string
  selectedRackId: string | null
  onSelectRack: (rack: MapRack) => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-200/80 via-slate-100 to-slate-200/60 p-4 shadow-inner">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Floor map</p>
          <h2 className="font-heading text-lg text-slate-900">{map.zoneLabel}</h2>
        </div>
        <FillLegend />
      </div>

      <div className="min-w-[640px] space-y-4">
        {map.aisles.map((aisle) => (
          <AisleRow
            key={aisle.id}
            aisle={aisle}
            search={search}
            selectedRackId={selectedRackId}
            onSelectRack={onSelectRack}
          />
        ))}
      </div>
    </div>
  )
}

function AisleRow({
  aisle,
  search,
  selectedRackId,
  onSelectRack,
}: {
  aisle: MapAisle
  search: string
  selectedRackId: string | null
  onSelectRack: (rack: MapRack) => void
}) {
  return (
    <section className="rounded-xl border border-slate-300/80 bg-white/70 p-3 shadow-sm backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Aisle
        </span>
        <h3 className="font-heading text-sm text-slate-900">{aisle.label}</h3>
        <span className="text-xs text-slate-500">{aisle.racks.length} racks</span>
      </div>

      {/* Walkway + rack row */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-slate-300/50"
          aria-hidden
        />
        <div className="relative flex flex-wrap gap-3 py-2">
          {aisle.racks.map((rack) => {
            const match = rackMatchesSearch(rack, search)
            const selected = selectedRackId === rack.id
            const dimmed = !!search.trim() && !match
            return (
              <button
                key={rack.id}
                type="button"
                onClick={() => onSelectRack(rack)}
                className={cn(
                  'min-w-[140px] flex-1 rounded-xl border-2 p-3 text-left shadow-sm transition sm:max-w-[200px]',
                  fillBandClass(rack.fillBand),
                  selected && 'ring-2 ring-primary-500 ring-offset-2',
                  dimmed && 'opacity-35',
                  match && search.trim() && 'ring-2 ring-sky-400 ring-offset-1',
                  'hover:scale-[1.02] hover:shadow-md'
                )}
              >
                <p className="font-mono text-sm font-bold">{rack.label.replace(/^Rack\s+/, '')}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {rack.zoneTypes.map((z) => ZONE_LABELS[z]).join(' · ')}
                </p>
                <p className="mt-2 text-[11px] leading-snug opacity-90">
                  {rack.shelfCount} shelf{rack.shelfCount === 1 ? '' : 's'} · {rack.filledUnits} units ·{' '}
                  {rack.skuCount} SKU{rack.skuCount === 1 ? '' : 's'}
                </p>
                <p className="mt-1 font-mono text-[10px] opacity-70">
                  {rack.locationCodes.slice(0, 2).join(', ')}
                  {rack.locationCodes.length > 2 ? '…' : ''}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-current opacity-60"
                    style={{ width: `${Math.min(100, rack.displayFillPercent)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] font-semibold">{rack.displayFillPercent.toFixed(0)}% fill</p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FillLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
      <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5">Empty</span>
      <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5">Low</span>
      <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5">Mid</span>
      <span className="rounded border border-rose-300 bg-rose-50 px-2 py-0.5">High</span>
    </div>
  )
}
