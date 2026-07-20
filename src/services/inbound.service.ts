import {
  binracks,
  brands,
  delay,
  hierarchy,
  refreshWorkerLoads,
  rackSlots,
  shipment,
  stockMoves,
  workers,
} from '@/data/mockInbound'
import { makeWorkEvent } from '@/lib/workerActivity'
import type {
  BinrackRow,
  Brand,
  CapacityRule,
  HierarchyNode,
  InboundShipment,
  MasterCarton,
  RackSlot,
  ScanProductResult,
  StockMove,
  WarehouseWorker,
  ZoneType,
} from '@/types/inbound'

/** Accept barcode, SKU, or display text like "AD-FORUM-01 · 890300001". */
function findProductOnCarton(carton: MasterCarton, rawScan: string) {
  const cleaned = rawScan.trim()
  if (!cleaned) return undefined

  const direct = carton.products.find(
    (p) => p.barcode === cleaned || p.sku === cleaned || p.id === cleaned
  )
  if (direct) return direct

  const parts = cleaned.split(/[·•|/\-]/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const maybeBarcode = parts[parts.length - 1]!
    const byPart = carton.products.find((p) => p.barcode === maybeBarcode || p.sku === maybeBarcode)
    if (byPart) return byPart
  }

  const digitMatch = cleaned.match(/(\d{6,})\s*$/)
  if (digitMatch) {
    return carton.products.find((p) => p.barcode === digitMatch[1])
  }

  const lower = cleaned.toLowerCase()
  return carton.products.find(
    (p) =>
      p.barcode.toLowerCase() === lower ||
      p.sku.toLowerCase() === lower ||
      `${p.sku} ${p.barcode}`.toLowerCase() === lower
  )
}

function matchesCapacity(fill: number, rules: CapacityRule[]): boolean {
  const active = rules.filter((r) => r.enabled)
  if (active.length === 0) return true
  return active.every((r) => {
    switch (r.op) {
      case 'eq':
        return fill === r.value
      case 'lt':
        return fill < r.value
      case 'gt':
        return fill > r.value
      case 'lte':
        return fill <= r.value
      case 'gte':
        return fill >= r.value
      default:
        return true
    }
  })
}

function stagedCartonsOnBay(bayId: string) {
  return shipment.cartons.filter(
    (c) =>
      c.stagingBinrackId === bayId &&
      !['PENDING', 'COMPLETE'].includes(c.status)
  )
}

function pickGoodsInBay(): BinrackRow {
  const bays = binracks.filter((b) => b.locationKind === 'carton_staging' || b.zoneType === 'goods_in')
  if (bays.length === 0) throw new Error('No Goods In staging bay configured')
  const withLoad = bays.map((bay) => ({
    bay,
    load: stagedCartonsOnBay(bay.id).length,
  }))
  withLoad.sort((a, b) => a.load - b.load || a.bay.locationCode.localeCompare(b.bay.locationCode))
  const chosen = withLoad[0]!
  if (chosen.load >= chosen.bay.maxUnits) {
    throw new Error('All Goods In dock bays are full — free a bay or add capacity')
  }
  return chosen.bay
}

function enrichBinrack(row: BinrackRow): BinrackRow {
  const isStaging = row.locationKind === 'carton_staging' || row.zoneType === 'goods_in'
  if (!isStaging) {
    return {
      ...row,
      locationKind: row.locationKind ?? 'product_shelf',
      stagedCartons: [],
    }
  }
  const staged = stagedCartonsOnBay(row.id)
  const filledUnits = staged.length
  return {
    ...row,
    locationKind: 'carton_staging',
    zoneType: 'goods_in',
    lineItems: [],
    stagedCartons: staged.map((c) => ({
      id: c.id,
      barcode: c.barcode,
      status: c.status,
      productCount: c.productCount,
      receivedAt: c.receivedAt,
    })),
    filledUnits,
    fillPercent: row.maxUnits > 0 ? Number(((filledUnits / row.maxUnits) * 100).toFixed(2)) : 0,
    skuCount: 0,
    itemQty: filledUnits,
  }
}

function requireWorkerOnShift(workerId?: string | null) {
  if (!workerId) throw new Error('Start your shift before doing work')
  const w = workers.find((x) => x.id === workerId)
  if (!w) throw new Error('Worker not found')
  if (!w.shiftStartedAt) throw new Error('Start your shift before doing work')
  return w
}

export const inboundService = {
  async listShipments(): Promise<InboundShipment[]> {
    await delay()
    return [structuredClone(shipment)]
  },

  async getShipment(id: string): Promise<InboundShipment | null> {
    await delay()
    if (shipment.id !== id) return null
    return structuredClone(shipment)
  },

  async receiveCarton(
    barcode: string,
    workerId?: string | null
  ): Promise<{ carton: MasterCarton; alreadyReceived: boolean; stagingLocationCode?: string }> {
    await delay()
    requireWorkerOnShift(workerId)
    const carton = shipment.cartons.find((c) => c.barcode === barcode || c.id === barcode)
    if (!carton) throw new Error('Carton not found on manifest')
    if (carton.status !== 'PENDING') {
      const bay = carton.stagingBinrackId
        ? binracks.find((b) => b.id === carton.stagingBinrackId)
        : undefined
      return {
        carton: structuredClone(carton),
        alreadyReceived: true,
        stagingLocationCode: bay?.locationCode,
      }
    }
    const bay = pickGoodsInBay()
    carton.status = 'RECEIVED'
    carton.receivedAt = new Date().toISOString()
    carton.stagingBinrackId = bay.id
    if (workerId) {
      const w = workers.find((x) => x.id === workerId)
      if (w) {
        w.activity.unshift(
          makeWorkEvent('carton_received', `${carton.id} → ${bay.locationCode}`)
        )
      }
    }
    return {
      carton: structuredClone(carton),
      alreadyReceived: false,
      stagingLocationCode: bay.locationCode,
    }
  },

  async getUnassignedCartons(): Promise<MasterCarton[]> {
    await delay()
    return structuredClone(shipment.cartons.filter((c) => c.status === 'RECEIVED'))
  },

  async getAssignedCartons(): Promise<MasterCarton[]> {
    await delay()
    return structuredClone(
      shipment.cartons.filter((c) =>
        ['ASSIGNED', 'OPENED', 'PUTAWAY_IN_PROGRESS', 'COMPLETE'].includes(c.status)
      )
    )
  },

  async listWorkers(): Promise<WarehouseWorker[]> {
    await delay()
    refreshWorkerLoads()
    return structuredClone(workers)
  },

  async assignCarton(
    cartonId: string,
    workerId: string,
    sorterId?: string | null
  ): Promise<MasterCarton> {
    await delay()
    requireWorkerOnShift(sorterId ?? null)
    const carton = shipment.cartons.find((c) => c.id === cartonId)
    if (!carton) throw new Error('Carton not found')
    if (carton.status !== 'RECEIVED') throw new Error('Carton is not awaiting assignment')
    const worker = workers.find((w) => w.id === workerId && w.role === 'PUTAWAY')
    if (!worker) throw new Error('Putaway worker not found')
    carton.status = 'ASSIGNED'
    carton.assignedWorkerId = workerId
    if (sorterId) {
      const sorter = workers.find((x) => x.id === sorterId)
      if (sorter) {
        sorter.activity.unshift(makeWorkEvent('carton_assigned', `${carton.id} → ${worker.name}`))
      }
    }
    refreshWorkerLoads()
    return structuredClone(carton)
  },

  async getMyCartons(workerId: string, asSupervisor = false): Promise<MasterCarton[]> {
    await delay()
    return structuredClone(
      shipment.cartons.filter((c) => {
        const inPutaway = ['ASSIGNED', 'OPENED', 'PUTAWAY_IN_PROGRESS'].includes(c.status)
        if (!inPutaway) return false
        if (asSupervisor) return true
        return c.assignedWorkerId === workerId
      })
    )
  },

  async getCarton(cartonId: string): Promise<MasterCarton | null> {
    await delay(50)
    const carton = shipment.cartons.find((c) => c.id === cartonId)
    return carton ? structuredClone(carton) : null
  },

  async openCarton(cartonId: string, workerId: string, asSupervisor = false): Promise<MasterCarton> {
    await delay()
    requireWorkerOnShift(workerId)
    const carton = shipment.cartons.find((c) => c.id === cartonId)
    if (!carton) throw new Error('Carton not found')
    if (!asSupervisor && carton.assignedWorkerId !== workerId) {
      throw new Error('Carton is not assigned to you')
    }
    if (!['ASSIGNED', 'OPENED', 'PUTAWAY_IN_PROGRESS'].includes(carton.status)) {
      throw new Error(`Carton cannot be opened (status: ${carton.status})`)
    }
    if (carton.status === 'ASSIGNED') carton.status = 'OPENED'
    return structuredClone(carton)
  },

  async openCartonByBarcode(barcode: string, workerId: string, asSupervisor = false): Promise<MasterCarton> {
    await delay()
    requireWorkerOnShift(workerId)
    const cleaned = barcode.trim()
    const carton = shipment.cartons.find(
      (c) => c.barcode === cleaned || c.id === cleaned || c.id.toLowerCase() === cleaned.toLowerCase()
    )
    if (!carton) throw new Error('Carton not found')
    if (!asSupervisor && carton.assignedWorkerId !== workerId) {
      throw new Error('This carton is not assigned to you')
    }
    if (!['ASSIGNED', 'OPENED', 'PUTAWAY_IN_PROGRESS'].includes(carton.status)) {
      throw new Error(`Carton cannot be opened (status: ${carton.status})`)
    }
    if (carton.status === 'ASSIGNED') carton.status = 'OPENED'
    return structuredClone(carton)
  },

  async scanProduct(rawScan: string, cartonId: string): Promise<ScanProductResult> {
    await delay()
    const carton = shipment.cartons.find((c) => c.id === cartonId)
    if (!carton) throw new Error('Carton not found')
    const product = findProductOnCarton(carton, rawScan)
    if (!product) {
      throw new Error('Product not on this carton manifest — scan the barcode only (e.g. 890300001)')
    }
    if (product.status === 'PLACED') throw new Error('Product already placed')
    product.status = 'SCANNED'
    carton.status = 'PUTAWAY_IN_PROGRESS'
    const brand = brands.find((b) => b.id === product.brandId)!
    const targetRack =
      rackSlots.find((r) => r.brandId === product.brandId && r.status !== 'FULL') ??
      rackSlots.find((r) => r.brandId === product.brandId) ??
      null
    return {
      product: structuredClone(product),
      brand: structuredClone(brand),
      targetRack: targetRack ? structuredClone(targetRack) : null,
    }
  },

  async confirmPlacement(
    productId: string,
    rackSlotId: string,
    cartonId: string,
    putawayWorkerId?: string | null
  ): Promise<void> {
    await delay()
    const carton = shipment.cartons.find((c) => c.id === cartonId)
    if (!carton) throw new Error('Carton not found')
    requireWorkerOnShift(putawayWorkerId ?? carton.assignedWorkerId)
    const product = carton.products.find((p) => p.id === productId)
    if (!product) throw new Error('Product not found')
    const rack = rackSlots.find((r) => r.id === rackSlotId)
    if (!rack) throw new Error('Rack not found')
    if (rack.status === 'FULL') throw new Error('RACK_FULL')
    if (rack.brandId && rack.brandId !== product.brandId) {
      throw new Error('Rack belongs to a different brand')
    }
    if (!rack.brandId) {
      rack.brandId = product.brandId
      rack.status = 'BRAND_ASSIGNED'
    }
    product.status = 'PLACED'
    product.rackSlotId = rack.id
    rack.filled += 1
    if (rack.filled >= rack.capacity) rack.status = 'FULL'

    const actorId = putawayWorkerId ?? carton.assignedWorkerId
    if (actorId) {
      const w = workers.find((x) => x.id === actorId)
      if (w) w.activity.unshift(makeWorkEvent('product_placed', product.sku))
    }

    if (carton.products.every((p) => p.status === 'PLACED')) {
      carton.status = 'COMPLETE'
      carton.stagingBinrackId = null
      if (actorId) {
        const w = workers.find((x) => x.id === actorId)
        if (w) w.activity.unshift(makeWorkEvent('carton_completed', carton.id))
      }
    }
    refreshWorkerLoads()
  },

  async getWorker(workerId: string): Promise<WarehouseWorker | null> {
    await delay(50)
    refreshWorkerLoads()
    const w = workers.find((x) => x.id === workerId)
    return w ? structuredClone(w) : null
  },

  async startShift(workerId: string): Promise<WarehouseWorker> {
    await delay()
    const w = workers.find((x) => x.id === workerId)
    if (!w) throw new Error('Worker not found')
    if (w.shiftStartedAt) throw new Error('Shift already started')
    const startedAt = new Date().toISOString()
    w.shiftStartedAt = startedAt
    w.shifts.unshift({ id: `sh-${Date.now()}`, startedAt, endedAt: null })
    return structuredClone(w)
  },

  async endShift(workerId: string): Promise<WarehouseWorker> {
    await delay()
    const w = workers.find((x) => x.id === workerId)
    if (!w) throw new Error('Worker not found')
    if (!w.shiftStartedAt) throw new Error('No active shift')
    const endedAt = new Date().toISOString()
    const open = w.shifts.find((s) => !s.endedAt)
    if (open) open.endedAt = endedAt
    w.shiftStartedAt = null
    return structuredClone(w)
  },

  async assignWorkerJob(
    workerId: string,
    role: 'DOCK_RECEIVER' | 'SORTER' | 'PUTAWAY',
    _supervisorId?: string | null
  ): Promise<WarehouseWorker> {
    await delay()
    const w = workers.find((x) => x.id === workerId)
    if (!w) throw new Error('Worker not found')
    if (w.role === 'WMS_SUPERVISOR') {
      throw new Error('Cannot reassign the supervisor account to a floor job')
    }
    w.role = role
    refreshWorkerLoads()
    return structuredClone(w)
  },

  async claimEmptyRack(rackSlotId: string, brandId: string): Promise<RackSlot> {
    await delay()
    const rack = rackSlots.find((r) => r.id === rackSlotId)
    if (!rack) throw new Error('Rack not found')
    if (rack.status !== 'EMPTY' && rack.filled > 0 && rack.brandId) {
      throw new Error('Rack is not empty')
    }
    rack.brandId = brandId
    rack.status = 'BRAND_ASSIGNED'
    return structuredClone(rack)
  },

  async getRacks(): Promise<RackSlot[]> {
    await delay()
    return structuredClone(rackSlots)
  },

  async getBrands(): Promise<Brand[]> {
    await delay()
    return structuredClone(brands)
  },
}

export const warehouseService = {
  async listBinracks(filters?: {
    search?: string
    zoneTypes?: ZoneType[]
    capacityRules?: CapacityRule[]
    hierarchyIds?: string[]
  }): Promise<BinrackRow[]> {
    await delay()
    let rows = binracks.map((r) => enrichBinrack(structuredClone(r)))
    const search = filters?.search?.trim().toLowerCase()
    if (search) {
      rows = rows.filter(
        (r) =>
          r.locationCode.toLowerCase().includes(search) ||
          r.lineItems.some(
            (li) =>
              li.sku.toLowerCase().includes(search) ||
              li.barcode.toLowerCase().includes(search) ||
              li.name.toLowerCase().includes(search)
          ) ||
          r.storageGroups.some((g) => g.toLowerCase().includes(search)) ||
          r.stagedCartons.some(
            (c) =>
              c.id.toLowerCase().includes(search) || c.barcode.toLowerCase().includes(search)
          )
      )
    }
    if (filters?.zoneTypes && filters.zoneTypes.length > 0) {
      rows = rows.filter((r) => filters.zoneTypes!.includes(r.zoneType))
    }
    if (filters?.capacityRules) {
      rows = rows.filter((r) => matchesCapacity(r.fillPercent, filters.capacityRules!))
    }
    if (filters?.hierarchyIds && filters.hierarchyIds.length > 0) {
      const ids = new Set(filters.hierarchyIds)
      rows = rows.filter((r) => r.hierarchyPath.some((id) => ids.has(id)))
    }
    return rows
  },

  async getHierarchy(): Promise<HierarchyNode[]> {
    await delay(100)
    return structuredClone(hierarchy)
  },

  async listMoves(search?: string): Promise<StockMove[]> {
    await delay()
    let rows = structuredClone(stockMoves)
    const q = search?.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (m) =>
          m.sku.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q) ||
          (m.fromLabel?.toLowerCase().includes(q) ?? false) ||
          (m.toLabel?.toLowerCase().includes(q) ?? false) ||
          (m.batchNo?.toLowerCase().includes(q) ?? false)
      )
    }
    return rows
  },

  async createMove(partial: Omit<StockMove, 'id' | 'createdAt' | 'state'>): Promise<StockMove> {
    await delay()
    const move: StockMove = {
      ...partial,
      id: `mv-${Date.now()}`,
      state: 'Open',
      createdAt: new Date().toISOString(),
    }
    stockMoves.unshift(move)
    return structuredClone(move)
  },

  async getBinrack(id: string): Promise<BinrackRow | null> {
    await delay(50)
    const row = binracks.find((b) => b.id === id)
    return row ? enrichBinrack(structuredClone(row)) : null
  },

  async createBinrack(input: {
    locationCode: string
    zoneType: ZoneType
    storageGroups: string[]
    capacity: { w: number; h: number; d: number }
    maxUnits: number
    hierarchyPath: string[]
  }): Promise<BinrackRow> {
    await delay()
    const code = input.locationCode.trim().toUpperCase()
    if (!code) throw new Error('Location code is required')
    if (binracks.some((b) => b.locationCode.toUpperCase() === code)) {
      throw new Error(`Location ${code} already exists`)
    }
    const locationKind = input.zoneType === 'goods_in' ? 'carton_staging' : 'product_shelf'
    const row: BinrackRow = {
      id: `bin-${Date.now()}`,
      locationCode: code,
      zoneType: input.zoneType,
      locationKind,
      storageGroups:
        input.storageGroups.length > 0
          ? input.storageGroups
          : locationKind === 'carton_staging'
            ? ['Dock floor', 'Pallet bay']
            : [],
      capacity: input.capacity,
      fillPercent: 0,
      skuCount: 0,
      itemQty: 0,
      hierarchyPath: input.hierarchyPath,
      brandId: null,
      maxUnits: input.maxUnits,
      filledUnits: 0,
      lineItems: [],
      stagedCartons: [],
    }
    binracks.unshift(row)
    return enrichBinrack(structuredClone(row))
  },

  async updateBinrack(
    id: string,
    input: {
      locationCode: string
      zoneType: ZoneType
      storageGroups: string[]
      capacity: { w: number; h: number; d: number }
      maxUnits: number
      hierarchyPath: string[]
    }
  ): Promise<BinrackRow> {
    await delay()
    const idx = binracks.findIndex((b) => b.id === id)
    if (idx < 0) throw new Error('Location not found')
    const code = input.locationCode.trim().toUpperCase()
    if (binracks.some((b) => b.id !== id && b.locationCode.toUpperCase() === code)) {
      throw new Error(`Location ${code} already exists`)
    }
    const existing = binracks[idx]!
    const locationKind = input.zoneType === 'goods_in' ? 'carton_staging' : 'product_shelf'
    if (locationKind === 'product_shelf' && stagedCartonsOnBay(id).length > 0) {
      throw new Error('Move staged cartons off this bay before changing it to a product shelf')
    }
    const fillPercent =
      input.maxUnits > 0 ? Number(((existing.filledUnits / input.maxUnits) * 100).toFixed(2)) : 0
    const updated: BinrackRow = {
      ...existing,
      locationCode: code,
      zoneType: input.zoneType,
      locationKind,
      storageGroups: input.storageGroups,
      capacity: input.capacity,
      maxUnits: input.maxUnits,
      hierarchyPath: input.hierarchyPath,
      fillPercent,
      lineItems: locationKind === 'carton_staging' ? [] : existing.lineItems,
    }
    binracks[idx] = updated
    return enrichBinrack(structuredClone(updated))
  },

  async deleteBinrack(id: string): Promise<void> {
    await delay()
    const idx = binracks.findIndex((b) => b.id === id)
    if (idx < 0) throw new Error('Location not found')
    const row = binracks[idx]!
    if (stagedCartonsOnBay(id).length > 0) {
      throw new Error('Cannot delete a dock bay that still has staged cartons.')
    }
    if (row.lineItems.length > 0 || row.itemQty > 0) {
      throw new Error('Cannot delete a location that still has stock. Move items out first.')
    }
    binracks.splice(idx, 1)
  },
}
