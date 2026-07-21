import type {
  BinrackRow,
  Brand,
  HierarchyNode,
  InboundShipment,
  MasterCarton,
  ProductUnit,
  RackSlot,
  StockMove,
  WarehouseWorker,
  ZoneType,
} from '@/types/inbound'

export const brands: Brand[] = [
  { id: 'brand-nike', name: 'Nike' },
  { id: 'brand-adidas', name: 'Adidas' },
  { id: 'brand-puma', name: 'Puma' },
]

/** Pre-registered bags / trolleys (scan these during unpack). Mutated via Locations Actions. */
export let trolleyBagLabels: string[] = ['NHHG23638838']

export const workers: WarehouseWorker[] = [
  {
    id: 'w-dock',
    name: 'Amit Dock',
    email: 'dock@upbox.test',
    role: 'DOCK_RECEIVER',
    openProductCount: 0,
    activity: [],
  },
  {
    id: 'w-unpack',
    name: 'Bina Unpacker',
    email: 'unpack@upbox.test',
    role: 'UNPACKER',
    openProductCount: 0,
    activity: [],
  },
  {
    id: 'w-put-1',
    name: 'Ravi Putaway',
    email: 'putaway@upbox.test',
    role: 'PUTAWAY',
    openProductCount: 0,
    activity: [],
  },
  {
    id: 'w-put-2',
    name: 'Priya Putaway',
    email: 'putaway2@upbox.test',
    role: 'PUTAWAY',
    openProductCount: 0,
    activity: [],
  },
  {
    id: 'w-sup',
    name: 'Sara Supervisor',
    email: 'supervisor@upbox.test',
    role: 'WMS_SUPERVISOR',
    openProductCount: 0,
    activity: [],
  },
]

/** Warehouse → Quadrant → Aisle → Rack → Bay → Shelf */
export const hierarchy: HierarchyNode[] = [
  {
    id: 'wh-main',
    label: 'Warehouse',
    type: 'warehouse',
    children: [
      {
        id: 'quad-w',
        label: 'West (W)',
        type: 'quadrant',
        children: [
          {
            id: 'aisle-dock',
            label: 'Dock staging',
            type: 'aisle',
            children: [
              { id: 'bay-dock-1', label: 'Bay 1', type: 'bay' },
              { id: 'bay-dock-2', label: 'Bay 2', type: 'bay' },
            ],
          },
          {
            id: 'aisle-w-a',
            label: 'Aisle A',
            type: 'aisle',
            children: [
              {
                id: 'rack-w-a-r1',
                label: 'Rack R1',
                type: 'rack',
                children: [
                  {
                    id: 'bay-w-a-r1-b1',
                    label: 'Bay B1',
                    type: 'bay',
                    children: [
                      { id: 'shelf-w-a-r1-b1-3', label: 'Shelf 3 · W.A.R1.B1.3', type: 'shelf' },
                    ],
                  },
                  {
                    id: 'bay-w-a-r1-b2',
                    label: 'Bay B2',
                    type: 'bay',
                    children: [
                      { id: 'shelf-w-a-r1-b2-1', label: 'Shelf 1 · W.A.R1.B2.1', type: 'shelf' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'aisle-w-b',
            label: 'Aisle B',
            type: 'aisle',
            children: [
              {
                id: 'rack-w-b-r1',
                label: 'Rack R1',
                type: 'rack',
                children: [
                  {
                    id: 'bay-w-b-r1-b1',
                    label: 'Bay B1',
                    type: 'bay',
                    children: [
                      { id: 'shelf-w-b-r1-b1-1', label: 'Shelf 1 · W.B.R1.B1.1', type: 'shelf' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'quad-n',
        label: 'North (N)',
        type: 'quadrant',
        children: [
          {
            id: 'aisle-n-a',
            label: 'Aisle A',
            type: 'aisle',
            children: [
              {
                id: 'rack-n-a-r1',
                label: 'Rack R1',
                type: 'rack',
                children: [
                  {
                    id: 'bay-n-a-r1-b1',
                    label: 'Bay B1',
                    type: 'bay',
                    children: [
                      { id: 'shelf-n-a-r1-b1-1', label: 'Shelf 1 · N.A.R1.B1.1', type: 'shelf' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'quad-s',
        label: 'South (S)',
        type: 'quadrant',
        children: [
          {
            id: 'aisle-s-a',
            label: 'Aisle A',
            type: 'aisle',
            children: [
              {
                id: 'rack-s-a-r1',
                label: 'Rack R1',
                type: 'rack',
                children: [
                  {
                    id: 'bay-s-a-r1-b1',
                    label: 'Bay B1',
                    type: 'bay',
                    children: [
                      { id: 'shelf-s-a-r1-b1-1', label: 'Shelf 1 · S.A.R1.B1.1', type: 'shelf' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'quad-e',
        label: 'East (E)',
        type: 'quadrant',
        children: [
          {
            id: 'aisle-e-c',
            label: 'Aisle C',
            type: 'aisle',
            children: [
              {
                id: 'rack-e-c-r5',
                label: 'Rack R5',
                type: 'rack',
                children: [
                  {
                    id: 'bay-e-c-r5-b7',
                    label: 'Bay B7',
                    type: 'bay',
                    children: [
                      { id: 'shelf-e-c-r5-b7-2', label: 'Shelf 2 · E.C.R5.B7.2', type: 'shelf' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

function makeProducts(
  cartonId: string,
  items: Array<{
    sku: string
    brandId: string
    barcode: string
    description: string
    value: number
    quantity?: number
  }>
): ProductUnit[] {
  const units: ProductUnit[] = []
  let n = 0
  for (const item of items) {
    const qty = Math.max(1, item.quantity ?? 1)
    for (let q = 0; q < qty; q += 1) {
      n += 1
      units.push({
        id: `${cartonId}-p${n}`,
        barcode: item.barcode,
        sku: item.sku,
        description: item.description,
        brandId: item.brandId,
        cartonId,
        rackSlotId: null,
        status: 'PENDING' as const,
        unitValue: item.value,
        stagingContainerLabel: null,
        assignedWorkerId: null,
        assignedRackSlotId: null,
      })
    }
  }
  return units
}

const carton1Products = makeProducts('CTN-001', [
  {
    sku: '42204084',
    brandId: 'brand-nike',
    barcode: '42204084',
    description: 'Product 42204084',
    value: 0,
    quantity: 3,
  },
  {
    sku: '8901542001246',
    brandId: 'brand-nike',
    barcode: '8901542001246',
    description: 'Product 8901542001246',
    value: 0,
    quantity: 3,
  },
  {
    sku: '250208843041',
    brandId: 'brand-nike',
    barcode: '250208843041',
    description: 'Product 250208843041',
    value: 0,
    quantity: 3,
  },
])

function carton(
  id: string,
  barcode: string,
  products: ProductUnit[],
  status: MasterCarton['status'] = 'PENDING',
  assignedWorkerId: string | null = null,
  receivedAt: string | null = null,
  stagingBinrackId: string | null = null
): MasterCarton {
  const brandId = products[0]?.brandId ?? null
  return {
    id,
    barcode,
    shipmentId: 'ship-001',
    status,
    assignedWorkerId,
    brandId,
    productCount: products.length,
    receivedAt,
    stagingBinrackId,
    products,
  }
}

export let shipment: InboundShipment = {
  id: 'ship-001',
  poNumber: 'PO-2024-001',
  supplierName: 'Footwear Wholesale Pvt Ltd',
  status: 'IN_TRANSIT',
  expectedAt: new Date().toISOString().slice(0, 10),
  cartons: [carton('CTN-001', '712226060322', carton1Products)],
}

/**
 * Pick racks: label = location code (W.A.R1.B1.3), barcode = physical scan ID.
 * Barcodes kept as provided: 8908004279854, 8902519009685.
 */
export let rackSlots: RackSlot[] = [
  {
    id: 'rack-1',
    label: 'W.A.R1.B1.3',
    barcode: '8908004279854',
    brandId: null,
    capacity: 20,
    filled: 0,
    status: 'EMPTY',
    zoneType: 'pick',
  },
  {
    id: 'rack-2',
    label: 'W.A.R1.B2.1',
    barcode: '8902519009685',
    brandId: null,
    capacity: 20,
    filled: 0,
    status: 'EMPTY',
    zoneType: 'pick',
  },
  {
    id: 'rack-gi-1',
    label: 'D-1',
    barcode: null,
    brandId: null,
    capacity: 100,
    filled: 0,
    status: 'EMPTY',
    zoneType: 'goods_in',
  },
]

function bin(
  id: string,
  locationCode: string,
  zoneType: ZoneType,
  hierarchyPath: string[],
  fillPercent: number,
  filledUnits: number,
  maxUnits: number,
  brandId: string | null,
  storageGroups: string[],
  lineItems: BinrackRow['lineItems'],
  opts?: {
    locationKind?: BinrackRow['locationKind']
    capacity?: BinrackRow['capacity']
    scanBarcode?: string | null
  }
): BinrackRow {
  const locationKind =
    opts?.locationKind ??
    (zoneType === 'goods_in'
      ? 'carton_staging'
      : zoneType === 'inspection'
        ? 'inspection_hold'
        : 'product_shelf')
  const skuSet = new Set(lineItems.map((l) => l.sku))
  return {
    id,
    locationCode,
    zoneType,
    locationKind,
    scanBarcode: opts?.scanBarcode ?? null,
    storageGroups,
    capacity: opts?.capacity ?? { w: 1, h: 1, d: 1 },
    fillPercent,
    skuCount: skuSet.size,
    itemQty: lineItems.reduce((s, l) => s + l.quantity, 0),
    hierarchyPath,
    brandId,
    maxUnits,
    filledUnits,
    lineItems,
    stagedCartons: [],
  }
}

export let binracks: BinrackRow[] = [
  // Goods In = floor / dock bays for whole master cartons (not product shelves)
  bin(
    'bin-dock-1',
    'D-1',
    'goods_in',
    ['wh-main', 'quad-w', 'aisle-dock', 'bay-dock-1'],
    0,
    0,
    12,
    null,
    ['Dock floor', 'Pallet bay'],
    [],
    { locationKind: 'carton_staging', capacity: { w: 2.4, h: 1.2, d: 1.0 } }
  ),
  bin(
    'bin-dock-2',
    'D-2',
    'goods_in',
    ['wh-main', 'quad-w', 'aisle-dock', 'bay-dock-2'],
    0,
    0,
    12,
    null,
    ['Dock floor', 'Pallet bay'],
    [],
    { locationKind: 'carton_staging', capacity: { w: 2.4, h: 1.2, d: 1.0 } }
  ),
  bin(
    'bin-rack-1',
    'W.A.R1.B1.3',
    'pick',
    ['wh-main', 'quad-w', 'aisle-w-a', 'rack-w-a-r1', 'bay-w-a-r1-b1', 'shelf-w-a-r1-b1-3'],
    0,
    0,
    20,
    null,
    [],
    [],
    { scanBarcode: '8908004279854' }
  ),
  bin(
    'bin-rack-2',
    'W.A.R1.B2.1',
    'pick',
    ['wh-main', 'quad-w', 'aisle-w-a', 'rack-w-a-r1', 'bay-w-a-r1-b2', 'shelf-w-a-r1-b2-1'],
    0,
    0,
    20,
    null,
    [],
    [],
    { scanBarcode: '8902519009685' }
  ),
  bin(
    'bin-insp-intake',
    'INSP-INTAKE',
    'inspection',
    ['wh-main', 'quad-w', 'aisle-dock'],
    0,
    0,
    500,
    null,
    ['Damaged intake'],
    []
  ),
  bin(
    'bin-insp-hold-a',
    'INSP-HOLD-A',
    'inspection',
    ['wh-main', 'quad-w', 'aisle-w-a'],
    0,
    0,
    200,
    null,
    ['QA hold'],
    []
  ),
  bin(
    'bin-insp-hold-b',
    'INSP-HOLD-B',
    'inspection',
    ['wh-main', 'quad-w', 'aisle-w-b'],
    0,
    0,
    200,
    null,
    ['QA hold'],
    []
  ),
]

/** Moves are created only by real warehouse actions — start empty. */
export let stockMoves: StockMove[] = []

export function delay(ms = 250): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function refreshWorkerLoads() {
  for (const w of workers) {
    if (w.role !== 'PUTAWAY') {
      w.openProductCount = 0
      continue
    }
    let n = 0
    for (const c of shipment.cartons) {
      for (const p of c.products) {
        if (p.assignedWorkerId === w.id && p.status === 'ASSIGNED') n += 1
      }
    }
    w.openProductCount = n
  }
}
