import {
  binracks,
  brands,
  delay,
  hierarchy,
  refreshWorkerLoads,
  rackSlots,
  shipment,
  stockMoves,
  trolleyBagLabels,
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
  MoveState,
  ProductUnit,
  RackSlot,
  ScanProductResult,
  StockMove,
  WarehouseWorker,
  ZoneType,
} from '@/types/inbound'

/** Accept barcode, SKU, or display text like "AD-FORUM-01 · 890300001".
 *  When several units share a barcode, prefer the next actionable unit (PENDING → ASSIGNED → STAGED). */
function findProductOnCarton(carton: MasterCarton, rawScan: string) {
  const cleaned = rawScan.trim()
  if (!cleaned) return undefined

  const matchesBarcode = (p: MasterCarton['products'][number]) => {
    if (p.barcode === cleaned || p.sku === cleaned || p.id === cleaned) return true
    const lower = cleaned.toLowerCase()
    return (
      p.barcode.toLowerCase() === lower ||
      p.sku.toLowerCase() === lower ||
      `${p.sku} ${p.barcode}`.toLowerCase() === lower
    )
  }

  let matches = carton.products.filter(matchesBarcode)

  if (matches.length === 0) {
    const parts = cleaned.split(/[·•|/\-]/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const maybeBarcode = parts[parts.length - 1]!
      matches = carton.products.filter(
        (p) => p.barcode === maybeBarcode || p.sku === maybeBarcode
      )
    }
  }

  if (matches.length === 0) {
    const digitMatch = cleaned.match(/(\d{6,})\s*$/)
    if (digitMatch) {
      matches = carton.products.filter((p) => p.barcode === digitMatch[1])
    }
  }

  if (matches.length === 0) return undefined

  return (
    matches.find((p) => p.status === 'PENDING') ??
    matches.find((p) => p.status === 'ASSIGNED') ??
    matches.find((p) => p.status === 'STAGED') ??
    matches[0]
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

function findProductAnywhere(rawScan: string): { carton: MasterCarton; product: MasterCarton['products'][number] } | null {
  for (const carton of shipment.cartons) {
    const product = findProductOnCarton(carton, rawScan)
    if (product) return { carton, product }
  }
  return null
}

function findRackByScan(raw: string): RackSlot | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const upper = trimmed.toUpperCase()
  const dotted = upper.replace(/[-_\s]+/g, '.')
  return rackSlots.find((r) => {
    if (r.id === trimmed) return true
    if (r.barcode && r.barcode.toUpperCase() === upper) return true
    const labelUpper = r.label.toUpperCase()
    if (labelUpper === upper) return true
    if (labelUpper.replace(/[-_\s]+/g, '.') === dotted) return true
    return false
  })
}

export type ScanEntityKind = 'carton' | 'product' | 'bag' | 'rack' | 'unknown'

const SCAN_KIND_LABEL: Record<ScanEntityKind, string> = {
  carton: 'a carton',
  product: 'a product',
  bag: 'a bag / trolley',
  rack: 'a rack',
  unknown: 'an unknown barcode',
}

/** Resolve what kind of ID was scanned — each step only accepts its own kind. */
function classifyScan(raw: string): ScanEntityKind {
  const cleaned = raw.trim()
  if (!cleaned) return 'unknown'
  const upper = cleaned.toUpperCase()

  if (trolleyBagLabels.some((l) => l.toUpperCase() === upper)) return 'bag'

  const rack = findRackByScan(cleaned)
  if (rack && rack.zoneType === 'pick') return 'rack'

  if (
    shipment.cartons.some(
      (c) =>
        c.barcode === cleaned ||
        c.id === cleaned ||
        c.id.toUpperCase() === upper ||
        c.barcode.toUpperCase() === upper
    )
  ) {
    return 'carton'
  }

  if (findProductAnywhere(cleaned)) return 'product'

  // Dock bay codes etc. — not a pick rack for putaway, treat as unknown for scan steps
  if (rack) return 'rack'

  return 'unknown'
}

function requireScanKind(raw: string, expected: ScanEntityKind): void {
  const kind = classifyScan(raw)
  if (kind === expected) return

  if (kind === 'unknown') {
    if (expected === 'bag') {
      throw new Error(
        `Not a registered bag / trolley. Scan a bag label${
          trolleyBagLabels[0] ? ` (e.g. ${trolleyBagLabels[0]})` : ''
        }.`
      )
    }
    if (expected === 'carton') throw new Error('Carton not found — scan a carton barcode')
    if (expected === 'product') throw new Error('Product not found — scan a product barcode')
    if (expected === 'rack') throw new Error('Rack not found — scan a pick rack barcode')
    throw new Error('Unknown barcode')
  }

  throw new Error(
    `Wrong scan — that is ${SCAN_KIND_LABEL[kind]}, but this step needs ${SCAN_KIND_LABEL[expected]}.`
  )
}

/** Carton done unpacking when nothing left PENDING (staged/assigned/placed/damaged OK). */
function maybeCompleteCartonAfterUnpack(carton: MasterCarton) {
  if (carton.products.every((p) => p.status !== 'PENDING')) {
    // Keep UNPACK_IN_PROGRESS / PUTAWAY until all placed or damaged fully handled by putaway completion
    if (carton.products.every((p) => p.status === 'PLACED' || p.status === 'DAMAGED')) {
      carton.status = 'COMPLETE'
      carton.stagingBinrackId = null
    }
  }
}

/** Rebuild pick/inspection inventory + rack fill from live product status (single source of truth). */
function rebuildLocationsFromShipment() {
  for (const row of binracks) {
    if (row.zoneType === 'goods_in') continue
    row.lineItems = []
    row.filledUnits = 0
    row.itemQty = 0
    row.skuCount = 0
    row.fillPercent = 0
    if (row.zoneType === 'pick') {
      row.brandId = null
      row.storageGroups = []
    }
  }

  for (const rack of rackSlots) {
    if (rack.zoneType !== 'pick') continue
    rack.filled = 0
    rack.brandId = null
    rack.status = 'EMPTY'
  }

  const ensurePickRow = (rack: RackSlot): BinrackRow => {
    const code = rack.label.trim().toUpperCase()
    let row = binracks.find((b) => b.locationCode.toUpperCase() === code)
    if (!row) {
      row = {
        id: `bin-${rack.id}`,
        locationCode: rack.label,
        zoneType: 'pick',
        locationKind: 'product_shelf',
        scanBarcode: rack.barcode,
        storageGroups: [],
        capacity: { w: 1, h: 1, d: 1 },
        fillPercent: 0,
        skuCount: 0,
        itemQty: 0,
        hierarchyPath: ['wh-main', 'quad-w'],
        brandId: null,
        maxUnits: Math.max(rack.capacity, 1),
        filledUnits: 0,
        lineItems: [],
        stagedCartons: [],
      }
      binracks.push(row)
    } else if (rack.barcode && !row.scanBarcode) {
      row.scanBarcode = rack.barcode
    }
    return row
  }

  const ensureInspectionIntake = (): BinrackRow => {
    let row =
      binracks.find((b) => b.id === 'bin-insp-intake') ??
      binracks.find((b) => b.zoneType === 'inspection')
    if (!row) {
      row = {
        id: 'bin-insp-intake',
        locationCode: 'INSP-INTAKE',
        zoneType: 'inspection',
        locationKind: 'inspection_hold',
        scanBarcode: null,
        storageGroups: ['Damaged intake'],
        capacity: { w: 1, h: 1, d: 1 },
        fillPercent: 0,
        skuCount: 0,
        itemQty: 0,
        hierarchyPath: ['wh-main', 'quad-w', 'aisle-dock'],
        brandId: null,
        maxUnits: 500,
        filledUnits: 0,
        lineItems: [],
        stagedCartons: [],
      }
      binracks.push(row)
    }
    return row
  }

  const addLine = (
    row: BinrackRow,
    product: ProductUnit,
    status: BinrackRow['lineItems'][number]['status']
  ) => {
    const existing = row.lineItems.find(
      (li) => li.sku === product.sku && li.barcode === product.barcode && li.status === status
    )
    if (existing) {
      existing.quantity += 1
    } else {
      row.lineItems.push({
        id: `li-${product.id}`,
        sku: product.sku,
        barcode: product.barcode,
        name: product.description,
        batchNo: null,
        status,
        fifo: row.lineItems.length + 1,
        quantity: 1,
        value: product.unitValue,
        brandId: product.brandId,
      })
    }
  }

  const finishRow = (row: BinrackRow) => {
    row.filledUnits = row.lineItems.reduce((s, l) => s + l.quantity, 0)
    row.itemQty = row.filledUnits
    row.skuCount = new Set(row.lineItems.map((l) => l.sku)).size
    row.fillPercent =
      row.maxUnits > 0 ? Number(((row.filledUnits / row.maxUnits) * 100).toFixed(2)) : 0
  }

  for (const carton of shipment.cartons) {
    for (const product of carton.products) {
      if (product.status === 'PLACED' && product.rackSlotId) {
        const rack = rackSlots.find((r) => r.id === product.rackSlotId)
        if (!rack || rack.zoneType !== 'pick') continue
        rack.filled += 1
        if (!rack.brandId) rack.brandId = product.brandId
        rack.status = rack.filled >= rack.capacity ? 'FULL' : 'BRAND_ASSIGNED'
        const row = ensurePickRow(rack)
        addLine(row, product, 'Available')
        if (!row.brandId) {
          row.brandId = product.brandId
          const brand = brands.find((b) => b.id === product.brandId)
          if (brand) row.storageGroups = [brand.name]
        }
        row.maxUnits = rack.capacity
      } else if (product.status === 'DAMAGED') {
        addLine(ensureInspectionIntake(), product, 'Damaged')
      }
    }
  }

  for (const row of binracks) {
    if (row.zoneType === 'goods_in') continue
    finishRow(row)
  }
}

function applyPlacementToLocation(_rack: RackSlot, _product: ProductUnit) {
  rebuildLocationsFromShipment()
}

function applyDamagedToInspection(_product: ProductUnit) {
  rebuildLocationsFromShipment()
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
    requireScanKind(barcode, 'carton')
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

  async getReceivedCartons(): Promise<MasterCarton[]> {
    await delay()
    return structuredClone(
      shipment.cartons.filter((c) =>
        ['RECEIVED', 'OPENED', 'UNPACK_IN_PROGRESS'].includes(c.status)
      )
    )
  },

  async getUnassignedCartons(): Promise<MasterCarton[]> {
    await delay()
    return structuredClone(shipment.cartons.filter((c) => c.status === 'RECEIVED'))
  },

  async getAssignedCartons(): Promise<MasterCarton[]> {
    await delay()
    return structuredClone(
      shipment.cartons.filter((c) =>
        ['ASSIGNED', 'OPENED', 'UNPACK_IN_PROGRESS', 'PUTAWAY_IN_PROGRESS', 'COMPLETE'].includes(
          c.status
        )
      )
    )
  },

  async listWorkers(): Promise<WarehouseWorker[]> {
    await delay()
    refreshWorkerLoads()
    return structuredClone(workers)
  },

  /** Unpacker: open a received carton */
  async openReceivedCarton(barcode: string, _unpackerId?: string | null): Promise<MasterCarton> {
    await delay()
    requireScanKind(barcode, 'carton')
    const cleaned = barcode.trim()
    const carton = shipment.cartons.find(
      (c) => c.barcode === cleaned || c.id === cleaned || c.id.toLowerCase() === cleaned.toLowerCase()
    )
    if (!carton) throw new Error('Carton not found')
    if (!['RECEIVED', 'OPENED', 'UNPACK_IN_PROGRESS'].includes(carton.status)) {
      throw new Error(`Carton cannot be opened for unpack (status: ${carton.status})`)
    }
    if (carton.status === 'RECEIVED') carton.status = 'OPENED'
    return structuredClone(carton)
  },

  /** Validate a bag / trolley scan (rejects product, carton, rack barcodes). */
  async requireBagScan(raw: string): Promise<string> {
    await delay(50)
    requireScanKind(raw, 'bag')
    const upper = raw.trim().toUpperCase()
    const match = trolleyBagLabels.find((l) => l.toUpperCase() === upper)
    return match ?? raw.trim()
  },

  /** Validate a carton scan (rejects product, bag, rack barcodes). */
  async requireCartonScan(raw: string): Promise<string> {
    await delay(50)
    requireScanKind(raw, 'carton')
    const cleaned = raw.trim()
    const carton = shipment.cartons.find(
      (c) =>
        c.barcode === cleaned ||
        c.id === cleaned ||
        c.barcode.toUpperCase() === cleaned.toUpperCase() ||
        c.id.toUpperCase() === cleaned.toUpperCase()
    )
    return carton?.barcode ?? cleaned
  },

  /** Validate a product scan (rejects carton, bag, rack barcodes). */
  async requireProductScan(raw: string): Promise<string> {
    await delay(50)
    requireScanKind(raw, 'product')
    return raw.trim()
  },

  /** Validate a pick-rack scan (rejects carton, bag, product barcodes). */
  async requireRackScan(raw: string): Promise<string> {
    await delay(50)
    requireScanKind(raw, 'rack')
    const rack = findRackByScan(raw)
    if (!rack || rack.zoneType !== 'pick') {
      throw new Error('Rack not found — scan a pick rack barcode')
    }
    return rack.label
  },

  /** Unpacker: scan product into bag/trolley staging */
  async scanProductToStaging(
    rawScan: string,
    cartonId: string,
    containerLabel?: string | null,
    unpackerId?: string | null
  ): Promise<ScanProductResult> {
    await delay()
    requireScanKind(rawScan, 'product')
    const carton = shipment.cartons.find((c) => c.id === cartonId)
    if (!carton) throw new Error('Carton not found')
    if (!['OPENED', 'UNPACK_IN_PROGRESS'].includes(carton.status)) {
      throw new Error('Open the carton before scanning products')
    }
    const bag = containerLabel?.trim()
    if (!bag) throw new Error('Scan a bag / trolley label before products')
    requireScanKind(bag, 'bag')
    const product = findProductOnCarton(carton, rawScan)
    if (!product) {
      throw new Error('Product not on this carton — scan the barcode only')
    }
    if (product.status !== 'PENDING') {
      throw new Error(`Product already ${product.status.toLowerCase()}`)
    }
    if (carton.brandId && product.brandId !== carton.brandId) {
      throw new Error('This carton is single-brand — product brand does not match carton')
    }
    if (!carton.brandId) {
      carton.brandId = product.brandId
    }
    product.status = 'STAGED'
    product.stagingContainerLabel = bag
    carton.status = 'UNPACK_IN_PROGRESS'
    const brand = brands.find((b) => b.id === product.brandId)!
    if (unpackerId) {
      const w = workers.find((x) => x.id === unpackerId)
      if (w) {
        w.activity.unshift(makeWorkEvent('product_staged', `${product.barcode} → ${bag}`))
      }
    }
    maybeCompleteCartonAfterUnpack(carton)
    return {
      product: structuredClone(product),
      brand: structuredClone(brand),
      targetRack: null,
    }
  },

  /** Unpacker: flag damage and send unit to inspection zone (not pick binracks) */
  async sendProductToInspection(
    rawScan: string,
    cartonId: string,
    unpackerId?: string | null
  ): Promise<ScanProductResult> {
    await delay()
    requireScanKind(rawScan, 'product')
    const carton = shipment.cartons.find((c) => c.id === cartonId)
    if (!carton) throw new Error('Carton not found')
    if (!['OPENED', 'UNPACK_IN_PROGRESS'].includes(carton.status)) {
      throw new Error('Open the carton before sending products to inspection')
    }
    const product = findProductOnCarton(carton, rawScan)
    if (!product) throw new Error('Product not on this carton')
    if (product.status === 'DAMAGED') throw new Error('Product already sent to inspection')
    if (product.status === 'PLACED') throw new Error('Product already placed on a rack')
    if (product.status === 'ASSIGNED') {
      throw new Error('Product already assigned to putaway — cancel assign first')
    }

    product.status = 'DAMAGED'
    product.stagingContainerLabel = null
    product.assignedWorkerId = null
    product.assignedRackSlotId = null
    carton.status = 'UNPACK_IN_PROGRESS'
    applyDamagedToInspection(product)

    const brand = brands.find((b) => b.id === product.brandId)!
    if (unpackerId) {
      const w = workers.find((x) => x.id === unpackerId)
      if (w) {
        w.activity.unshift(makeWorkEvent('product_damaged', `${product.barcode} → inspection`))
      }
    }
    maybeCompleteCartonAfterUnpack(carton)
    refreshWorkerLoads()
    return {
      product: structuredClone(product),
      brand: structuredClone(brand),
      targetRack: null,
    }
  },

  async getStagedProducts(): Promise<
    Array<MasterCarton['products'][number] & { cartonId: string; cartonBarcode: string }>
  > {
    await delay()
    const rows: Array<MasterCarton['products'][number] & { cartonId: string; cartonBarcode: string }> =
      []
    for (const c of shipment.cartons) {
      for (const p of c.products) {
        if (p.status === 'STAGED') {
          rows.push({ ...structuredClone(p), cartonId: c.id, cartonBarcode: c.barcode })
        }
      }
    }
    return rows
  },

  /** Bags / trolleys — registered empty labels plus any with staged/assigned products */
  async listTrolleyBags(): Promise<
    Array<{
      label: string
      productCount: number
      cartonIds: string[]
      products: Array<
        MasterCarton['products'][number] & { cartonId: string; cartonBarcode: string }
      >
    }>
  > {
    await delay()
    const map = new Map<
      string,
      {
        label: string
        products: Array<
          MasterCarton['products'][number] & { cartonId: string; cartonBarcode: string }
        >
        cartonIds: Set<string>
      }
    >()

    for (const label of trolleyBagLabels) {
      map.set(label, { label, products: [], cartonIds: new Set() })
    }

    for (const c of shipment.cartons) {
      for (const p of c.products) {
        if (!p.stagingContainerLabel) continue
        if (p.status !== 'STAGED' && p.status !== 'ASSIGNED') continue
        const label = p.stagingContainerLabel
        let bag = map.get(label)
        if (!bag) {
          bag = { label, products: [], cartonIds: new Set() }
          map.set(label, bag)
        }
        bag.products.push({ ...structuredClone(p), cartonId: c.id, cartonBarcode: c.barcode })
        bag.cartonIds.add(c.id)
      }
    }
    return [...map.values()]
      .map((b) => ({
        label: b.label,
        productCount: b.products.length,
        cartonIds: [...b.cartonIds],
        products: b.products,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  },

  async assignStagedProducts(input: {
    productIds: string[]
    workerId: string
    rackSlotId: string
    supervisorId?: string | null
  }): Promise<number> {
    await delay()
    const worker = workers.find((w) => w.id === input.workerId && w.role === 'PUTAWAY')
    if (!worker) throw new Error('Putaway worker not found')
    const rack = rackSlots.find((r) => r.id === input.rackSlotId)
    if (!rack) throw new Error('Rack not found')
    if (rack.zoneType === 'goods_in' || rack.zoneType === 'inspection') {
      throw new Error('Assign a pick binrack only — not dock or inspection')
    }
    if (input.productIds.length === 0) throw new Error('Select at least one product')

    let count = 0
    for (const pid of input.productIds) {
      for (const carton of shipment.cartons) {
        const product = carton.products.find((p) => p.id === pid)
        if (!product) continue
        if (product.status !== 'STAGED') {
          throw new Error(`${product.barcode} is not staged`)
        }
        if (rack.zoneType === 'pick' && rack.brandId && rack.brandId !== product.brandId) {
          throw new Error(`Rack ${rack.label} is dedicated to another brand`)
        }
        product.status = 'ASSIGNED'
        product.assignedWorkerId = worker.id
        product.assignedRackSlotId = rack.id
        count += 1
      }
    }
    if (count === 0) throw new Error('No matching staged products found')

    // One move row per assign batch — same products appear on bag → rack
    const sample = (() => {
      for (const carton of shipment.cartons) {
        for (const p of carton.products) {
          if (input.productIds.includes(p.id)) return p
        }
      }
      return null
    })()
    if (sample) {
      stockMoves.unshift({
        id: `mv-${Date.now()}`,
        username: worker.name,
        workerId: worker.id,
        sku: sample.sku,
        batchNo: null,
        fromBinrackId: 'bag',
        fromLabel: sample.stagingContainerLabel ?? 'Bag',
        fromZone: 'goods_in',
        toBinrackId: binracks.find((b) => b.locationCode === rack.label)?.id ?? null,
        toLabel: rack.label,
        toZone: 'pick',
        quantity: count,
        state: 'Open',
        createdAt: new Date().toISOString(),
      })
    }

    if (input.supervisorId) {
      const sup = workers.find((x) => x.id === input.supervisorId)
      if (sup) {
        sup.activity.unshift(
          makeWorkEvent(
            'products_assigned',
            `${count} → ${worker.name} @ ${rack.label}`
          )
        )
      }
    }
    refreshWorkerLoads()
    return count
  },

  async getMyAssignedProducts(
    workerId: string,
    asSupervisor = false
  ): Promise<
    Array<
      MasterCarton['products'][number] & {
        cartonId: string
        assignedRackLabel: string | null
      }
    >
  > {
    await delay()
    const rows: Array<
      MasterCarton['products'][number] & { cartonId: string; assignedRackLabel: string | null }
    > = []
    for (const c of shipment.cartons) {
      for (const p of c.products) {
        if (p.status !== 'ASSIGNED') continue
        if (!asSupervisor && p.assignedWorkerId !== workerId) continue
        const rack = p.assignedRackSlotId
          ? rackSlots.find((r) => r.id === p.assignedRackSlotId)
          : null
        rows.push({
          ...structuredClone(p),
          cartonId: c.id,
          assignedRackLabel: rack?.label ?? null,
        })
      }
    }
    return rows
  },

  /** Putaway: scan product assigned to this worker (optionally must be in scanned bag) */
  async scanAssignedProduct(
    rawScan: string,
    workerId: string,
    asSupervisor = false,
    bagLabel?: string | null
  ): Promise<ScanProductResult> {
    await delay()
    requireScanKind(rawScan, 'product')
    const found = findProductAnywhere(rawScan)
    if (!found) throw new Error('Product not found')
    const { product } = found
    if (product.status !== 'ASSIGNED') {
      throw new Error(`Product is ${product.status.toLowerCase()} — need assigned products`)
    }
    if (!asSupervisor && product.assignedWorkerId !== workerId) {
      throw new Error('This product is not assigned to you')
    }
    if (bagLabel) {
      const expected = bagLabel.trim().toLowerCase()
      const actual = (product.stagingContainerLabel ?? '').trim().toLowerCase()
      if (actual !== expected) {
        throw new Error(
          actual
            ? `Product is in “${product.stagingContainerLabel}”, not “${bagLabel}”`
            : `Product has no bag — expected “${bagLabel}”`
        )
      }
    }
    const brand = brands.find((b) => b.id === product.brandId)!
    const targetRack = product.assignedRackSlotId
      ? rackSlots.find((r) => r.id === product.assignedRackSlotId) ?? null
      : null
    return {
      product: structuredClone(product),
      brand: structuredClone(brand),
      targetRack: targetRack ? structuredClone(targetRack) : null,
    }
  },

  /** Putaway step 2: scan rack for the pending product (every product needs its own rack scan) */
  async confirmPlacementOnRack(
    productId: string,
    rackScan: string,
    putawayWorkerId: string,
    asSupervisor = false
  ): Promise<void> {
    await delay()
    requireScanKind(rackScan, 'rack')
    let carton: MasterCarton | undefined
    let product: MasterCarton['products'][number] | undefined
    for (const c of shipment.cartons) {
      const p = c.products.find((x) => x.id === productId)
      if (p) {
        carton = c
        product = p
        break
      }
    }
    if (!carton || !product) throw new Error('Product not found')
    if (product.status !== 'ASSIGNED') throw new Error('Product is not awaiting putaway')
    if (!asSupervisor && product.assignedWorkerId !== putawayWorkerId) {
      throw new Error('Product is not assigned to you')
    }
    if (!product.assignedRackSlotId) throw new Error('Product has no assigned rack')

    const rack = findRackByScan(rackScan)
    if (!rack) throw new Error('Rack not found')
    if (rack.id !== product.assignedRackSlotId) {
      const expected = rackSlots.find((r) => r.id === product!.assignedRackSlotId)
      throw new Error(
        `Wrong rack — expected ${expected?.label ?? product.assignedRackSlotId}, got ${rack.label}`
      )
    }
    if (rack.zoneType === 'goods_in') {
      throw new Error('Cannot put products on dock staging')
    }
    if (rack.zoneType === 'inspection' || rack.label.toUpperCase().startsWith('INSP-')) {
      throw new Error('Inspection is not a putaway rack — damaged goods are sent there by unpack')
    }
    if (rack.status === 'FULL') throw new Error('RACK_FULL')

    if (rack.zoneType === 'pick') {
      if (rack.brandId && rack.brandId !== product.brandId) {
        throw new Error('Rack belongs to a different brand')
      }
      if (!rack.brandId) {
        rack.brandId = product.brandId
        rack.status = 'BRAND_ASSIGNED'
      }
    } else {
      throw new Error('Putaway only uses pick binracks')
    }

    product.status = 'PLACED'
    product.rackSlotId = rack.id
    applyPlacementToLocation(rack, product)
    carton.status = 'PUTAWAY_IN_PROGRESS'

    // Close matching open assign moves when this rack's queue for the worker is done
    const stillOpen = shipment.cartons.some((c) =>
      c.products.some(
        (p) =>
          p.status === 'ASSIGNED' &&
          p.assignedWorkerId === putawayWorkerId &&
          p.assignedRackSlotId === rack.id
      )
    )
    if (!stillOpen) {
      for (const m of stockMoves) {
        if (
          m.state !== 'Complete' &&
          m.workerId === putawayWorkerId &&
          m.toLabel === rack.label
        ) {
          m.state = 'Complete'
        }
      }
    }

    const actorId = putawayWorkerId
    const w = workers.find((x) => x.id === actorId)
    if (w) {
      w.activity.unshift(makeWorkEvent('product_placed', `${product.sku} → ${rack.label}`))
    }

    if (carton.products.every((p) => p.status === 'PLACED' || p.status === 'DAMAGED')) {
      carton.status = 'COMPLETE'
      carton.stagingBinrackId = null
      if (w) w.activity.unshift(makeWorkEvent('carton_completed', carton.id))
    }
    refreshWorkerLoads()
  },

  async getMyCartons(workerId: string, asSupervisor = false): Promise<MasterCarton[]> {
    await delay()
    return structuredClone(
      shipment.cartons.filter((c) => {
        const hasAssigned = c.products.some(
          (p) =>
            p.status === 'ASSIGNED' && (asSupervisor || p.assignedWorkerId === workerId)
        )
        return hasAssigned
      })
    )
  },

  async getCarton(cartonId: string): Promise<MasterCarton | null> {
    await delay(50)
    const carton = shipment.cartons.find((c) => c.id === cartonId)
    return carton ? structuredClone(carton) : null
  },

  async getWorker(workerId: string): Promise<WarehouseWorker | null> {
    await delay(50)
    refreshWorkerLoads()
    const w = workers.find((x) => x.id === workerId)
    return w ? structuredClone(w) : null
  },

  async assignWorkerJob(
    workerId: string,
    role: 'DOCK_RECEIVER' | 'UNPACKER' | 'PUTAWAY',
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
    rebuildLocationsFromShipment()
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
    rebuildLocationsFromShipment()
    let rows = binracks.map((r) => enrichBinrack(structuredClone(r)))
    const search = filters?.search?.trim().toLowerCase()
    if (search) {
      rows = rows.filter(
        (r) =>
          r.locationCode.toLowerCase().includes(search) ||
          (r.scanBarcode?.toLowerCase().includes(search) ?? false) ||
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

  async listMoves(filters?: {
    search?: string
    states?: MoveState[]
    fromZones?: ZoneType[]
    toZones?: ZoneType[]
    usernames?: string[]
  }): Promise<StockMove[]> {
    await delay()
    let rows = structuredClone(stockMoves)
    const q = filters?.search?.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (m) =>
          m.sku.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q) ||
          (m.fromLabel?.toLowerCase().includes(q) ?? false) ||
          (m.toLabel?.toLowerCase().includes(q) ?? false) ||
          (m.batchNo?.toLowerCase().includes(q) ?? false) ||
          m.state.toLowerCase().includes(q) ||
          m.fromZone.toLowerCase().includes(q) ||
          (m.toZone?.toLowerCase().includes(q) ?? false)
      )
    }
    if (filters?.states && filters.states.length > 0) {
      rows = rows.filter((m) => filters.states!.includes(m.state))
    }
    if (filters?.fromZones && filters.fromZones.length > 0) {
      rows = rows.filter((m) => filters.fromZones!.includes(m.fromZone))
    }
    if (filters?.toZones && filters.toZones.length > 0) {
      rows = rows.filter((m) => m.toZone != null && filters.toZones!.includes(m.toZone))
    }
    if (filters?.usernames && filters.usernames.length > 0) {
      rows = rows.filter((m) => filters.usernames!.includes(m.username))
    }
    return rows
  },

  async listMoveUsernames(): Promise<string[]> {
    await delay(50)
    return [...new Set(stockMoves.map((m) => m.username))].sort((a, b) => a.localeCompare(b))
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
    rebuildLocationsFromShipment()
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
    scanBarcode?: string | null
  }): Promise<BinrackRow> {
    await delay()
    const code = input.locationCode.trim().toUpperCase()
    if (!code) throw new Error('Location code is required')
    if (binracks.some((b) => b.locationCode.toUpperCase() === code)) {
      throw new Error(`Location ${code} already exists`)
    }
    const scanBarcode =
      input.zoneType === 'pick' ? (input.scanBarcode?.trim() || null) : null
    if (input.zoneType === 'pick' && !scanBarcode) {
      throw new Error('Scan barcode is required for pick shelf locations')
    }
    if (
      scanBarcode &&
      (binracks.some((b) => b.scanBarcode?.toUpperCase() === scanBarcode.toUpperCase()) ||
        rackSlots.some((r) => r.barcode?.toUpperCase() === scanBarcode.toUpperCase()))
    ) {
      throw new Error(`Barcode ${scanBarcode} is already used by another rack`)
    }
    const locationKind =
      input.zoneType === 'goods_in'
        ? 'carton_staging'
        : input.zoneType === 'inspection'
          ? 'inspection_hold'
          : 'product_shelf'
    const row: BinrackRow = {
      id: `bin-${Date.now()}`,
      locationCode: code,
      zoneType: input.zoneType,
      locationKind,
      scanBarcode,
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
    if (input.zoneType === 'pick') {
      if (!rackSlots.some((r) => r.label.toUpperCase() === code)) {
        rackSlots.push({
          id: `rack-${Date.now()}`,
          label: code,
          barcode: scanBarcode,
          brandId: null,
          capacity: Math.max(1, input.maxUnits),
          filled: 0,
          status: 'EMPTY',
          zoneType: 'pick',
        })
      }
    }
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
      scanBarcode?: string | null
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
    const prevCode = existing.locationCode.toUpperCase()
    const scanBarcode =
      input.zoneType === 'pick'
        ? (input.scanBarcode?.trim() || existing.scanBarcode || null)
        : null
    if (input.zoneType === 'pick' && !scanBarcode) {
      throw new Error('Scan barcode is required for pick shelf locations')
    }
    if (
      scanBarcode &&
      (binracks.some(
        (b) =>
          b.id !== id && b.scanBarcode?.toUpperCase() === scanBarcode.toUpperCase()
      ) ||
        rackSlots.some(
          (r) =>
            r.label.toUpperCase() !== prevCode &&
            r.barcode?.toUpperCase() === scanBarcode.toUpperCase()
        ))
    ) {
      throw new Error(`Barcode ${scanBarcode} is already used by another rack`)
    }
    const locationKind =
      input.zoneType === 'goods_in'
        ? 'carton_staging'
        : input.zoneType === 'inspection'
          ? 'inspection_hold'
          : 'product_shelf'
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
      scanBarcode,
      storageGroups: input.storageGroups,
      capacity: input.capacity,
      maxUnits: input.maxUnits,
      hierarchyPath: input.hierarchyPath,
      fillPercent,
      lineItems: locationKind === 'carton_staging' ? [] : existing.lineItems,
    }
    binracks[idx] = updated

    // Keep scannable pick racks in sync with Locations binrack codes
    const rack = rackSlots.find((r) => r.label.toUpperCase() === prevCode)
    if (input.zoneType === 'pick') {
      if (rack) {
        rack.label = code
        rack.barcode = scanBarcode
        rack.capacity = Math.max(rack.capacity, input.maxUnits)
        rack.zoneType = 'pick'
      } else if (!rackSlots.some((r) => r.label.toUpperCase() === code)) {
        rackSlots.push({
          id: `rack-${Date.now()}`,
          label: code,
          barcode: scanBarcode,
          brandId: null,
          capacity: Math.max(1, input.maxUnits),
          filled: 0,
          status: 'EMPTY',
          zoneType: 'pick',
        })
      }
    } else if (rack) {
      const ri = rackSlots.indexOf(rack)
      if (ri >= 0) rackSlots.splice(ri, 1)
    }

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
    const code = row.locationCode.toUpperCase()
    binracks.splice(idx, 1)
    const ri = rackSlots.findIndex((r) => r.label.toUpperCase() === code)
    if (ri >= 0) rackSlots.splice(ri, 1)
  },

  async createBag(label: string): Promise<string> {
    await delay()
    const cleaned = label.trim()
    if (!cleaned) throw new Error('Bag / trolley label is required')
    if (trolleyBagLabels.some((l) => l.toUpperCase() === cleaned.toUpperCase())) {
      throw new Error(`Bag / trolley “${cleaned}” already exists`)
    }
    // Reject if label collides with carton/product/rack registries
    if (classifyScan(cleaned) !== 'unknown') {
      throw new Error(`“${cleaned}” is already used as another barcode type`)
    }
    trolleyBagLabels.push(cleaned)
    trolleyBagLabels.sort((a, b) => a.localeCompare(b))
    return cleaned
  },

  async renameBag(oldLabel: string, newLabel: string): Promise<string> {
    await delay()
    const from = oldLabel.trim()
    const to = newLabel.trim()
    if (!to) throw new Error('Bag / trolley label is required')
    const idx = trolleyBagLabels.findIndex((l) => l.toUpperCase() === from.toUpperCase())
    if (idx < 0) throw new Error('Bag / trolley not found')
    if (
      trolleyBagLabels.some(
        (l, i) => i !== idx && l.toUpperCase() === to.toUpperCase()
      )
    ) {
      throw new Error(`Bag / trolley “${to}” already exists`)
    }
    if (classifyScan(to) !== 'unknown' && to.toUpperCase() !== from.toUpperCase()) {
      // allow same-kind rename; classify may hit bag itself
      const kind = classifyScan(to)
      if (kind !== 'bag') {
        throw new Error(`“${to}” is already used as another barcode type`)
      }
    }
    // Block rename if products are in the bag
    for (const c of shipment.cartons) {
      for (const p of c.products) {
        if (
          (p.stagingContainerLabel ?? '').toUpperCase() === from.toUpperCase() &&
          (p.status === 'STAGED' || p.status === 'ASSIGNED')
        ) {
          throw new Error('Cannot rename a bag that still has staged or assigned products')
        }
      }
    }
    trolleyBagLabels[idx] = to
    trolleyBagLabels.sort((a, b) => a.localeCompare(b))
    return to
  },

  async deleteBag(label: string): Promise<void> {
    await delay()
    const cleaned = label.trim()
    const idx = trolleyBagLabels.findIndex((l) => l.toUpperCase() === cleaned.toUpperCase())
    if (idx < 0) throw new Error('Bag / trolley not found')
    for (const c of shipment.cartons) {
      for (const p of c.products) {
        if (
          (p.stagingContainerLabel ?? '').toUpperCase() === cleaned.toUpperCase() &&
          (p.status === 'STAGED' || p.status === 'ASSIGNED')
        ) {
          throw new Error('Cannot delete a bag that still has staged or assigned products')
        }
      }
    }
    trolleyBagLabels.splice(idx, 1)
  },
}
