import { useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { LocationDetailPanel } from '@/components/locations/LocationDetailPanel'
import { RackBayMap } from '@/components/locations/RackBayMap'
import { WarehouseFloorMap } from '@/components/locations/WarehouseFloorMap'
import { EmptyState, LoadingPanel, PageHeader } from '@/components/ui/InventoryPrimitives'
import { useInventoryLocations } from '@/hooks/useInventory'
import {
  buildWarehouseMap,
  findRack,
  findShelf,
  type MapRack,
  type MapShelf,
} from '@/lib/warehouseMap'
import { cn } from '@/lib/cn'

type Level = 'floor' | 'rack'

export function LocationsBrowserPage(props: { embedded?: boolean } = {}) {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<Level>('floor')
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null)
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null)

  // Full set for map; search only highlights / dims tiles
  const locsQ = useInventoryLocations('')

  const map = useMemo(
    () => (locsQ.data ? buildWarehouseMap(locsQ.data) : null),
    [locsQ.data]
  )

  const selectedRack: MapRack | null = map && selectedRackId ? findRack(map, selectedRackId) : null
  const selectedShelf: MapShelf | null =
    map && selectedShelfId ? findShelf(map, selectedShelfId) : null

  const onSelectRack = (rack: MapRack) => {
    setSelectedRackId(rack.id)
    setSelectedShelfId(null)
    setLevel('rack')
  }

  const onSelectShelf = (shelf: MapShelf) => {
    setSelectedShelfId(shelf.id)
  }

  const backToFloor = () => {
    setLevel('floor')
    setSelectedRackId(null)
    setSelectedShelfId(null)
  }

  const crumbs = [
    { label: map?.zoneLabel ?? 'Warehouse', onClick: backToFloor, active: level === 'floor' && !selectedShelf },
    ...(selectedRack
      ? [
          {
            label: selectedRack.aisleLabel,
            onClick: () => {
              setLevel('rack')
              setSelectedShelfId(null)
            },
            active: false,
          },
          {
            label: selectedRack.label,
            onClick: () => {
              setLevel('rack')
              setSelectedShelfId(null)
            },
            active: level === 'rack' && !selectedShelf,
          },
        ]
      : []),
    ...(selectedShelf
      ? [
          {
            label: selectedShelf.location.hierarchyLabels[2] ?? 'Bay',
            onClick: () => setSelectedShelfId(null),
            active: false,
          },
          {
            label: selectedShelf.location.locationCode,
            onClick: undefined as (() => void) | undefined,
            active: true,
          },
        ]
      : []),
  ]

  return (
    <div>
      {props.embedded ? null : (
        <PageHeader
          title="Floor map"
          description="Interactive warehouse map using Quadrant.Aisle.Rack.Bay.Shelf codes (e.g. W.A.R1.B1.3)."
        />
      )}

      <div className="surface-card mb-4 space-y-3 p-3">
        <div className="relative min-w-0">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(draft)
            }}
            placeholder="Search location code or SKU to highlight on the map…"
            className="surface-input w-full py-2 pl-3 pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setSearch(draft)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-600" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3 w-3 text-slate-400" /> : null}
              {c.onClick ? (
                <button
                  type="button"
                  onClick={c.onClick}
                  className={cn(
                    'rounded px-1.5 py-0.5 font-semibold hover:bg-slate-100',
                    c.active ? 'text-primary-700' : 'text-slate-600'
                  )}
                >
                  {c.label}
                </button>
              ) : (
                <span className={cn('px-1.5 py-0.5 font-bold', c.active && 'text-primary-700')}>
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {locsQ.isLoading ? (
        <LoadingPanel label="Loading warehouse map…" />
      ) : !map || map.aisles.length === 0 ? (
        <EmptyState title="No locations found" />
      ) : (
        <div className={cn('flex flex-col gap-4', selectedShelf ? 'lg:flex-row' : '')}>
          <div className="min-w-0 flex-1">
            {level === 'floor' || !selectedRack ? (
              <WarehouseFloorMap
                map={map}
                search={search}
                selectedRackId={selectedRackId}
                onSelectRack={onSelectRack}
              />
            ) : (
              <RackBayMap
                rack={selectedRack}
                search={search}
                selectedShelfId={selectedShelfId}
                onSelectShelf={onSelectShelf}
                onBack={backToFloor}
              />
            )}
          </div>

          {selectedShelf ? (
            <LocationDetailPanel shelf={selectedShelf} onClose={() => setSelectedShelfId(null)} />
          ) : null}
        </div>
      )}
    </div>
  )
}
