import {
  brands,
  catalog,
  delay,
  incomingOrders,
  inventoryLocations,
  inventoryRackSlots,
} from '@/data/mockInventory'
import { binracks as portalBinracks, rackSlots as portalRacks } from '@/data/mockInbound'
import type {
  IncomingOrder,
  IncomingOrderLine,
  InventoryLocation,
  InventorySummary,
  OnboardedBrand,
  RackUtilizationRow,
  SkuInventoryRow,
  SkuLocationStock,
  StockHealth,
} from '@/types/inventory'
import { parseLocationCode, quadrantLabel } from '@/lib/locationCode'
import type { BinrackRow } from '@/types/inbound'

function brandName(id: string) {
  return brands.find((b) => b.id === id)?.name ?? 'Unknown'
}

function computeHealth(onHand: number, incoming: number, reorderPoint: number): StockHealth {
  if (onHand <= 0 && incoming > 0) return 'incoming_only'
  if (onHand <= 0) return 'out'
  if (onHand <= Math.max(1, Math.floor(reorderPoint * 0.4))) return 'critical'
  if (onHand <= reorderPoint) return 'low'
  return 'healthy'
}

function labelsFromPortal(row: BinrackRow): string[] {
  const parts = parseLocationCode(row.locationCode)
  if (parts) {
    return [
      'Warehouse',
      `${quadrantLabel(parts.quadrant)} (${parts.quadrant})`,
      `Aisle ${parts.aisle}`,
      `Rack ${parts.rack}`,
      `Bay ${parts.bay}`,
      `Shelf ${parts.shelf}`,
    ]
  }
  if (row.locationCode.startsWith('D-')) {
    return ['Warehouse', 'West (W)', 'Dock staging', row.locationCode]
  }
  if (row.locationCode.startsWith('INSP-')) {
    return ['Warehouse', 'West (W)', 'Inspection', row.locationCode]
  }
  return ['Warehouse', row.locationCode]
}

function portalToInventoryLocation(row: BinrackRow): InventoryLocation {
  return {
    id: row.id,
    locationCode: row.locationCode,
    zoneType: row.zoneType,
    locationKind: row.locationKind,
    hierarchyPath: row.hierarchyPath,
    hierarchyLabels: labelsFromPortal(row),
    brandId: row.brandId,
    maxUnits: row.maxUnits,
    filledUnits: row.filledUnits,
    fillPercent: row.fillPercent,
    lineItems: row.lineItems.map((li) => ({
      id: li.id,
      sku: li.sku,
      barcode: li.barcode,
      name: li.name,
      batchNo: li.batchNo,
      status: li.status,
      quantity: li.quantity,
      brandId: li.brandId,
    })),
    scanBarcode: row.scanBarcode,
  }
}

/** Merge inventory demo stock with live portal locations (portal wins on same code when it has stock). */
function mergedLocations(): InventoryLocation[] {
  const byCode = new Map<string, InventoryLocation>()
  for (const loc of inventoryLocations) {
    byCode.set(loc.locationCode.toUpperCase(), structuredClone(loc))
  }
  for (const row of portalBinracks) {
    const key = row.locationCode.toUpperCase()
    const adapted = portalToInventoryLocation(row)
    const existing = byCode.get(key)
    if (!existing) {
      byCode.set(key, adapted)
      continue
    }
    // Merge portal putaway lines into inventory location
    if (adapted.lineItems.length > 0) {
      const invOnly = existing.lineItems.filter((li) => li.id.startsWith('inv-') || !li.id.startsWith('li-'))
      const portalLines = adapted.lineItems
      const mergedLines = [...portalLines]
      for (const li of invOnly) {
        if (!mergedLines.some((m) => m.sku === li.sku && m.status === li.status)) {
          mergedLines.push(li)
        }
      }
      const filledUnits = mergedLines.reduce((s, l) => s + l.quantity, 0)
      byCode.set(key, {
        ...existing,
        ...adapted,
        hierarchyLabels: existing.hierarchyLabels.length ? existing.hierarchyLabels : adapted.hierarchyLabels,
        lineItems: mergedLines,
        filledUnits,
        fillPercent:
          existing.maxUnits > 0
            ? Number(((filledUnits / Math.max(existing.maxUnits, 50)) * 100).toFixed(2))
            : adapted.fillPercent,
      })
    }
  }
  return [...byCode.values()]
}

function incomingBySku(): Map<string, number> {
  const pendingMap = new Map<string, number>()
  for (const order of incomingOrders) {
    for (const unit of order.units) {
      if (unit.status === 'pending' || unit.status === 'staged') {
        pendingMap.set(unit.sku, (pendingMap.get(unit.sku) ?? 0) + 1)
      }
    }
  }
  return pendingMap
}

function buildSkuRows(): SkuInventoryRow[] {
  const incomingMap = incomingBySku()
  const locations = mergedLocations()

  return catalog.map((item) => {
    const skuLocations: SkuLocationStock[] = []
    let onHand = 0
    let reserved = 0

    for (const bin of locations) {
      for (const line of bin.lineItems) {
        if (line.sku !== item.sku) continue
        const isReserved = line.status === 'Reserved'
        const isDamaged = line.status === 'Damaged'
        const available = isReserved || isDamaged ? 0 : line.quantity
        const reservedQty = isReserved ? line.quantity : 0
        onHand += line.quantity
        reserved += reservedQty
        skuLocations.push({
          binrackId: bin.id,
          locationCode: bin.locationCode,
          zoneType: bin.zoneType,
          hierarchyLabel: bin.hierarchyLabels.join(' › '),
          quantity: line.quantity,
          reserved: reservedQty,
          available,
          status: line.status,
          batchNo: line.batchNo,
          fillPercent: bin.fillPercent,
        })
      }
    }

    const incoming = incomingMap.get(item.sku) ?? 0
    const available = Math.max(0, onHand - reserved)
    const primaryLocation =
      [...skuLocations].sort((a, b) => b.available - a.available)[0]?.locationCode ?? null

    return {
      catalogId: item.id,
      sku: item.sku,
      name: item.name,
      brandId: item.brandId,
      brandName: brandName(item.brandId),
      barcode: item.barcode,
      asin: item.asin,
      fnsku: item.fnsku,
      unitValue: item.unitValue,
      reorderPoint: item.reorderPoint,
      source: item.source,
      onHand,
      reserved,
      available,
      incoming,
      locationCount: new Set(skuLocations.map((l) => l.binrackId)).size,
      primaryLocation,
      locations: skuLocations,
      health: computeHealth(available, incoming, item.reorderPoint),
      status: item.status,
    }
  })
}

function buildIncomingOrders(): IncomingOrder[] {
  return incomingOrders.map((order) => {
    const lineMap = new Map<string, IncomingOrderLine>()
    for (const unit of order.units) {
      const key = unit.sku
      const existing = lineMap.get(key) ?? {
        sku: unit.sku,
        name: unit.name,
        brandId: unit.brandId,
        brandName: brandName(unit.brandId),
        qtyExpected: 0,
        qtyReceived: 0,
        qtyPending: 0,
      }
      existing.qtyExpected += 1
      if (unit.status === 'received' || unit.status === 'staged') existing.qtyReceived += 1
      if (unit.status === 'pending') existing.qtyPending += 1
      lineMap.set(key, existing)
    }
    const lines = [...lineMap.values()]
    const brandIds = [...new Set(lines.map((l) => l.brandId))]
    return {
      id: order.id,
      poNumber: order.poNumber,
      sellerName: order.sellerName,
      brandIds,
      brandNames: brandIds.map(brandName),
      status: order.status,
      expectedAt: order.expectedAt,
      cartonCount: order.cartonCount,
      unitsExpected: order.units.length,
      unitsReceived: order.units.filter((u) => u.status === 'received' || u.status === 'staged').length,
      unitsPending: order.units.filter((u) => u.status === 'pending').length,
      lines,
      source: order.source,
    }
  })
}

function buildUtilization(): RackUtilizationRow[] {
  const locations = mergedLocations()
  const fromBins: RackUtilizationRow[] = locations.map((bin) => {
    const softCap = bin.locationKind === 'carton_staging' ? bin.maxUnits : Math.max(bin.filledUnits, 50)
    const fillPercent =
      bin.locationKind === 'carton_staging'
        ? bin.fillPercent
        : Number(((bin.filledUnits / softCap) * 100).toFixed(1))

    let status: RackUtilizationRow['status'] = 'BRAND_ASSIGNED'
    if (bin.filledUnits === 0) status = 'EMPTY'
    else if (fillPercent >= 95) status = 'FULL'
    else if (fillPercent >= 70) status = 'NEAR_FULL'

    return {
      id: bin.id,
      label: bin.locationCode,
      locationCode: bin.locationCode,
      zoneType: bin.zoneType,
      brandId: bin.brandId,
      brandName: bin.brandId ? brandName(bin.brandId) : null,
      capacity: softCap,
      filled: bin.filledUnits,
      fillPercent,
      skuCount: new Set(bin.lineItems.map((l) => l.sku)).size,
      status,
      hierarchyLabel: bin.hierarchyLabels.join(' › '),
    }
  })

  const binCodes = new Set(locations.map((b) => b.locationCode))
  const racks = [...inventoryRackSlots, ...portalRacks]
  for (const rack of racks) {
    if (binCodes.has(rack.label)) continue
    const fillPercent = rack.capacity > 0 ? Number(((rack.filled / rack.capacity) * 100).toFixed(1)) : 0
    let status: RackUtilizationRow['status'] = rack.status
    if (rack.status === 'BRAND_ASSIGNED' && fillPercent >= 70) status = 'NEAR_FULL'
    fromBins.push({
      id: rack.id,
      label: rack.label,
      locationCode: rack.label,
      zoneType: rack.zoneType,
      brandId: rack.brandId,
      brandName: rack.brandId ? brandName(rack.brandId) : null,
      capacity: rack.capacity,
      filled: rack.filled,
      fillPercent,
      skuCount: 0,
      status,
      hierarchyLabel: `${rack.zoneType} › ${rack.label}`,
    })
  }

  return fromBins.sort((a, b) => b.fillPercent - a.fillPercent)
}

export type ListSkusFilters = {
  brandId?: string | 'all'
  search?: string
  health?: StockHealth | 'all' | 'needs_seller_update'
}

export const inventoryService = {
  async listBrands(): Promise<OnboardedBrand[]> {
    await delay()
    return structuredClone(brands)
  },

  async getSummary(brandId?: string | 'all'): Promise<InventorySummary> {
    await delay()
    const rows = buildSkuRows().filter((r) => !brandId || brandId === 'all' || r.brandId === brandId)
    const util = buildUtilization()
    const avg =
      util.length === 0 ? 0 : Number((util.reduce((s, r) => s + r.fillPercent, 0) / util.length).toFixed(1))

    return {
      brandCount: brands.filter((b) => b.status !== 'paused').length,
      skuCount: rows.length,
      unitsOnHand: rows.reduce((s, r) => s + r.onHand, 0),
      unitsIncoming: rows.reduce((s, r) => s + r.incoming, 0),
      lowStockCount: rows.filter((r) => r.health === 'low' || r.health === 'critical').length,
      outOfStockCount: rows.filter((r) => r.health === 'out' || r.health === 'incoming_only').length,
      avgRackUtilization: avg,
      racksNearFull: util.filter((r) => r.status === 'NEAR_FULL' || r.status === 'FULL').length,
      emptyRacks: util.filter((r) => r.status === 'EMPTY').length,
    }
  },

  async listSkus(filters: ListSkusFilters = {}): Promise<SkuInventoryRow[]> {
    await delay()
    const q = filters.search?.trim().toLowerCase() ?? ''
    let rows = buildSkuRows()
    if (filters.brandId && filters.brandId !== 'all') {
      rows = rows.filter((r) => r.brandId === filters.brandId)
    }
    if (filters.health && filters.health !== 'all') {
      if (filters.health === 'needs_seller_update') {
        rows = rows.filter((r) => r.health === 'low' || r.health === 'critical')
      } else {
        rows = rows.filter((r) => r.health === filters.health)
      }
    }
    if (q) {
      rows = rows.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.barcode.toLowerCase().includes(q) ||
          (r.asin?.toLowerCase().includes(q) ?? false) ||
          (r.fnsku?.toLowerCase().includes(q) ?? false) ||
          r.brandName.toLowerCase().includes(q)
      )
    }
    return rows.sort((a, b) => a.brandName.localeCompare(b.brandName) || a.sku.localeCompare(b.sku))
  },

  async getSku(sku: string): Promise<SkuInventoryRow | null> {
    await delay(80)
    return buildSkuRows().find((r) => r.sku === sku) ?? null
  },

  async listUtilization(filters?: {
    zoneType?: string | 'all'
    brandId?: string | 'all'
    band?: 'all' | 'empty' | 'mid' | 'near_full' | 'full'
  }): Promise<RackUtilizationRow[]> {
    await delay()
    let rows = buildUtilization()
    if (filters?.zoneType && filters.zoneType !== 'all') {
      rows = rows.filter((r) => r.zoneType === filters.zoneType)
    }
    if (filters?.brandId && filters.brandId !== 'all') {
      rows = rows.filter((r) => r.brandId === filters.brandId)
    }
    if (filters?.band && filters.band !== 'all') {
      rows = rows.filter((r) => {
        if (filters.band === 'empty') return r.status === 'EMPTY' || r.fillPercent === 0
        if (filters.band === 'full') return r.status === 'FULL' || r.fillPercent >= 95
        if (filters.band === 'near_full')
          return r.status === 'NEAR_FULL' || (r.fillPercent >= 70 && r.fillPercent < 95)
        return r.fillPercent > 0 && r.fillPercent < 70
      })
    }
    return rows
  },

  async listIncoming(brandId?: string | 'all'): Promise<IncomingOrder[]> {
    await delay()
    let rows = buildIncomingOrders()
    if (brandId && brandId !== 'all') {
      rows = rows.filter((o) => o.brandIds.includes(brandId))
    }
    return rows.sort((a, b) => a.expectedAt.localeCompare(b.expectedAt))
  },

  async listLocations(search?: string): Promise<InventoryLocation[]> {
    await delay()
    const q = search?.trim().toLowerCase() ?? ''
    let rows = mergedLocations()
    if (q) {
      rows = rows.filter(
        (r) =>
          r.locationCode.toLowerCase().includes(q) ||
          r.hierarchyLabels.some((l) => l.toLowerCase().includes(q)) ||
          r.lineItems.some(
            (li) =>
              li.sku.toLowerCase().includes(q) ||
              li.name.toLowerCase().includes(q) ||
              li.barcode.toLowerCase().includes(q)
          )
      )
    }
    return rows
  },
}
