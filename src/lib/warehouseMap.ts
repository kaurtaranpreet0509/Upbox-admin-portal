import type { InventoryLocation, ZoneType } from '@/types/inventory'
import { parseLocationCode, quadrantLabel } from '@/lib/locationCode'

export type FillBand = 'empty' | 'low' | 'mid' | 'high'

export interface MapShelf {
  id: string
  location: InventoryLocation
  skuCount: number
  fillBand: FillBand
  displayFillPercent: number
}

export interface MapBay {
  id: string
  label: string
  shelves: MapShelf[]
  filledUnits: number
  skuCount: number
  displayFillPercent: number
  fillBand: FillBand
}

export interface MapRack {
  id: string
  label: string
  aisleId: string
  aisleLabel: string
  zoneLabel: string
  zoneTypes: ZoneType[]
  locationCodes: string[]
  bays: MapBay[]
  shelves: MapShelf[]
  filledUnits: number
  skuCount: number
  shelfCount: number
  displayFillPercent: number
  fillBand: FillBand
}

export interface MapAisle {
  id: string
  label: string
  zoneLabel: string
  racks: MapRack[]
}

export interface WarehouseMap {
  zoneLabel: string
  aisles: MapAisle[]
}

function fillBand(pct: number): FillBand {
  if (pct <= 0) return 'empty'
  if (pct < 30) return 'low'
  if (pct < 70) return 'mid'
  return 'high'
}

function displayFill(loc: InventoryLocation): number {
  if (loc.locationKind === 'carton_staging') return loc.fillPercent
  const softCap = Math.max(loc.filledUnits, 50)
  return Number(((loc.filledUnits / softCap) * 100).toFixed(1))
}

function toShelf(loc: InventoryLocation): MapShelf {
  const pct = displayFill(loc)
  return {
    id: loc.id,
    location: loc,
    skuCount: new Set(loc.lineItems.map((l) => l.sku)).size,
    fillBand: fillBand(pct),
    displayFillPercent: pct,
  }
}

/**
 * Rack key from location code.
 * W.A.R1.B1.3 → W.A.R1
 * D-1 → D-1
 * INSP-HOLD-A → INSP-HOLD-A
 */
export function rackKeyFromCode(locationCode: string): string {
  const parts = parseLocationCode(locationCode)
  if (parts) return `${parts.quadrant}.${parts.aisle}.${parts.rack}`
  return locationCode.trim().toUpperCase()
}

function aisleKeyFromLocation(loc: InventoryLocation): { id: string; label: string; zone: string } {
  const parts = parseLocationCode(loc.locationCode)
  if (parts) {
    return {
      id: `aisle-${parts.quadrant.toLowerCase()}-${parts.aisle.toLowerCase()}`,
      label: `Aisle ${parts.aisle}`,
      zone: `${quadrantLabel(parts.quadrant)} (${parts.quadrant})`,
    }
  }
  if (loc.locationCode.startsWith('D-') || loc.zoneType === 'goods_in') {
    return {
      id: loc.hierarchyPath[2] ?? 'aisle-dock',
      label: loc.hierarchyLabels[2] ?? loc.hierarchyLabels[1] ?? 'Dock staging',
      zone: loc.hierarchyLabels[1] ?? loc.hierarchyLabels[0] ?? 'West (W)',
    }
  }
  if (loc.zoneType === 'inspection' || loc.locationCode.startsWith('INSP-')) {
    return {
      id: 'aisle-inspection',
      label: 'Inspection',
      zone: loc.hierarchyLabels[1] ?? 'West (W)',
    }
  }
  return {
    id: loc.hierarchyPath[2] ?? loc.hierarchyPath[1] ?? 'aisle',
    label: loc.hierarchyLabels[2] ?? loc.hierarchyLabels[1] ?? 'Aisle',
    zone: loc.hierarchyLabels[1] ?? loc.hierarchyLabels[0] ?? 'Warehouse',
  }
}

function bayKeyFromLocation(loc: InventoryLocation, rackKey: string): { id: string; label: string } {
  const parts = parseLocationCode(loc.locationCode)
  if (parts) {
    return {
      id: `${rackKey}.${parts.bay}`,
      label: `Bay ${parts.bay}`,
    }
  }
  return {
    id: loc.hierarchyPath[loc.hierarchyPath.length - 1] ?? `${rackKey}-bay`,
    label: loc.hierarchyLabels[loc.hierarchyLabels.length - 2] ?? loc.hierarchyLabels.at(-1) ?? 'Bay',
  }
}

function aggregateFill(shelves: MapShelf[]): number {
  if (shelves.length === 0) return 0
  return Number(
    (shelves.reduce((s, sh) => s + sh.displayFillPercent, 0) / shelves.length).toFixed(1)
  )
}

export function buildWarehouseMap(binracks: InventoryLocation[]): WarehouseMap {
  const zoneLabel = binracks[0]?.hierarchyLabels[0] ?? 'Warehouse'

  type AisleBucket = {
    id: string
    label: string
    zoneLabel: string
    racks: Map<string, InventoryLocation[]>
  }

  const aisleMap = new Map<string, AisleBucket>()

  for (const loc of binracks) {
    const aisleMeta = aisleKeyFromLocation(loc)
    let aisle = aisleMap.get(aisleMeta.id)
    if (!aisle) {
      aisle = {
        id: aisleMeta.id,
        label: aisleMeta.label,
        zoneLabel: aisleMeta.zone,
        racks: new Map(),
      }
      aisleMap.set(aisleMeta.id, aisle)
    }
    const rackKey = rackKeyFromCode(loc.locationCode)
    const list = aisle.racks.get(rackKey) ?? []
    list.push(loc)
    aisle.racks.set(rackKey, list)
  }

  const aisles: MapAisle[] = [...aisleMap.values()].map((aisle) => {
    const racks: MapRack[] = [...aisle.racks.entries()].map(([rackKey, locs]) => {
      const shelves = locs.map(toShelf)
      const bayMap = new Map<string, MapShelf[]>()
      for (const shelf of shelves) {
        const bay = bayKeyFromLocation(shelf.location, rackKey)
        const arr = bayMap.get(bay.id) ?? []
        arr.push(shelf)
        bayMap.set(bay.id, arr)
      }

      const bays: MapBay[] = [...bayMap.entries()].map(([bayId, bayShelves]) => {
        const first = bayShelves[0]!
        const bayMeta = bayKeyFromLocation(first.location, rackKey)
        const pct = aggregateFill(bayShelves)
        return {
          id: bayId,
          label: bayMeta.label,
          shelves: bayShelves.sort((a, b) =>
            a.location.locationCode.localeCompare(b.location.locationCode)
          ),
          filledUnits: bayShelves.reduce((s, sh) => s + sh.location.filledUnits, 0),
          skuCount: bayShelves.reduce((s, sh) => s + sh.skuCount, 0),
          displayFillPercent: pct,
          fillBand: fillBand(pct),
        }
      })

      const pct = aggregateFill(shelves)
      const zoneTypes = [...new Set(shelves.map((s) => s.location.zoneType))]
      const parts = parseLocationCode(locs[0]?.locationCode ?? '')
      const rackLabel = parts ? `Rack ${parts.rack}` : `Rack ${rackKey}`

      return {
        id: `${aisle.id}::${rackKey}`,
        label: rackLabel,
        aisleId: aisle.id,
        aisleLabel: aisle.label,
        zoneLabel: aisle.zoneLabel,
        zoneTypes,
        locationCodes: shelves.map((s) => s.location.locationCode),
        bays: bays.sort((a, b) => a.label.localeCompare(b.label)),
        shelves: shelves.sort((a, b) =>
          a.location.locationCode.localeCompare(b.location.locationCode)
        ),
        filledUnits: shelves.reduce((s, sh) => s + sh.location.filledUnits, 0),
        skuCount: shelves.reduce((s, sh) => s + sh.skuCount, 0),
        shelfCount: shelves.length,
        displayFillPercent: pct,
        fillBand: fillBand(pct),
      }
    })

    return {
      id: aisle.id,
      label: aisle.label,
      zoneLabel: aisle.zoneLabel,
      racks: racks.sort((a, b) => a.label.localeCompare(b.label)),
    }
  })

  aisles.sort((a, b) => {
    const aDock = a.label.toLowerCase().includes('dock') ? 0 : 1
    const bDock = b.label.toLowerCase().includes('dock') ? 0 : 1
    if (aDock !== bDock) return aDock - bDock
    const aInsp = a.label.toLowerCase().includes('inspection') ? 2 : 1
    const bInsp = b.label.toLowerCase().includes('inspection') ? 2 : 1
    if (aInsp !== bInsp) return aInsp - bInsp
    return a.label.localeCompare(b.label)
  })

  return { zoneLabel, aisles }
}

export function findRack(map: WarehouseMap, rackId: string): MapRack | null {
  for (const aisle of map.aisles) {
    const rack = aisle.racks.find((r) => r.id === rackId)
    if (rack) return rack
  }
  return null
}

export function findShelf(map: WarehouseMap, shelfId: string): MapShelf | null {
  for (const aisle of map.aisles) {
    for (const rack of aisle.racks) {
      const shelf = rack.shelves.find((s) => s.id === shelfId)
      if (shelf) return shelf
    }
  }
  return null
}

export function rackMatchesSearch(rack: MapRack, q: string): boolean {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  if (rack.label.toLowerCase().includes(needle)) return true
  if (rack.aisleLabel.toLowerCase().includes(needle)) return true
  if (rack.locationCodes.some((c) => c.toLowerCase().includes(needle))) return true
  return rack.shelves.some(
    (s) =>
      s.location.locationCode.toLowerCase().includes(needle) ||
      s.location.lineItems.some(
        (li) =>
          li.sku.toLowerCase().includes(needle) ||
          li.name.toLowerCase().includes(needle) ||
          li.barcode.toLowerCase().includes(needle)
      )
  )
}

export function shelfMatchesSearch(shelf: MapShelf, q: string): boolean {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const loc = shelf.location
  return (
    loc.locationCode.toLowerCase().includes(needle) ||
    loc.hierarchyLabels.some((l) => l.toLowerCase().includes(needle)) ||
    loc.lineItems.some(
      (li) =>
        li.sku.toLowerCase().includes(needle) ||
        li.name.toLowerCase().includes(needle) ||
        li.barcode.toLowerCase().includes(needle)
    )
  )
}

export function fillBandClass(band: FillBand): string {
  switch (band) {
    case 'empty':
      return 'border-slate-300 bg-slate-100 text-slate-600'
    case 'low':
      return 'border-emerald-300 bg-emerald-50 text-emerald-950'
    case 'mid':
      return 'border-amber-300 bg-amber-50 text-amber-950'
    case 'high':
      return 'border-rose-300 bg-rose-50 text-rose-950'
  }
}
