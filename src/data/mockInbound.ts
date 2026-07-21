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
import { seedWorkerActivity } from '@/lib/workerActivity'

export const brands: Brand[] = [
  { id: 'brand-nike', name: 'Nike' },
  { id: 'brand-adidas', name: 'Adidas' },
  { id: 'brand-puma', name: 'Puma' },
]

export const workers: WarehouseWorker[] = [
  {
    id: 'w-dock',
    name: 'Amit Dock',
    email: 'dock@upbox.test',
    role: 'DOCK_RECEIVER',
    openCartonCount: 0,
    activity: seedWorkerActivity('w-dock', 'DOCK_RECEIVER'),
    shiftStartedAt: null,
    shifts: [
      {
        id: 'sh-dock-1',
        startedAt: new Date(Date.now() - 26 * 3600000).toISOString(),
        endedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
      },
    ],
  },
  {
    id: 'w-sort',
    name: 'Bina Sorter',
    email: 'sort@upbox.test',
    role: 'SORTER',
    openCartonCount: 0,
    activity: seedWorkerActivity('w-sort', 'SORTER'),
    shiftStartedAt: null,
    shifts: [],
  },
  {
    id: 'w-put-1',
    name: 'Ravi Putaway',
    email: 'putaway@upbox.test',
    role: 'PUTAWAY',
    openCartonCount: 0,
    activity: seedWorkerActivity('w-put-1', 'PUTAWAY'),
    shiftStartedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    shifts: [
      {
        id: 'sh-put1-open',
        startedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        endedAt: null,
      },
    ],
  },
  {
    id: 'w-put-2',
    name: 'Priya Putaway',
    email: 'putaway2@upbox.test',
    role: 'PUTAWAY',
    openCartonCount: 1,
    activity: seedWorkerActivity('w-put-2', 'PUTAWAY'),
    shiftStartedAt: null,
    shifts: [],
  },
  {
    id: 'w-sup',
    name: 'Sara Supervisor',
    email: 'supervisor@upbox.test',
    role: 'WMS_SUPERVISOR',
    openCartonCount: 0,
    activity: seedWorkerActivity('w-sup', 'WMS_SUPERVISOR'),
    shiftStartedAt: null,
    shifts: [
      {
        id: 'sh-sup-1',
        startedAt: new Date(Date.now() - 30 * 3600000).toISOString(),
        endedAt: new Date(Date.now() - 22 * 3600000).toISOString(),
      },
    ],
  },
]

export const hierarchy: HierarchyNode[] = [
  {
    id: 'zone-west',
    label: 'Warehouse West',
    type: 'zone',
    children: [
      {
        id: 'aisle-dock',
        label: 'Dock staging',
        type: 'aisle',
        children: [
          { id: 'bay-dock-1', label: 'Bay 1', type: 'stack' },
          { id: 'bay-dock-2', label: 'Bay 2', type: 'stack' },
        ],
      },
      {
        id: 'aisle-a',
        label: 'Aisle A',
        type: 'aisle',
        children: [
          { id: 'stack-a1', label: 'Bay 1', type: 'stack' },
          { id: 'stack-a2', label: 'Bay 2', type: 'stack' },
        ],
      },
      {
        id: 'aisle-b',
        label: 'Aisle B',
        type: 'aisle',
        children: [
          { id: 'stack-b1', label: 'Bay 1', type: 'stack' },
          { id: 'stack-b2', label: 'Bay 2', type: 'stack' },
        ],
      },
    ],
  },
]

function makeProducts(
  cartonId: string,
  items: Array<{ sku: string; brandId: string; barcode: string; description: string; value: number }>
): ProductUnit[] {
  return items.map((item, i) => ({
    id: `${cartonId}-p${i + 1}`,
    barcode: item.barcode,
    sku: item.sku,
    description: item.description,
    brandId: item.brandId,
    cartonId,
    rackSlotId: null,
    status: 'PENDING' as const,
    unitValue: item.value,
  }))
}

const carton1Products = makeProducts('CTN-001', [
  { sku: 'NK-AIR-001', brandId: 'brand-nike', barcode: '890100001', description: 'Nike Air Max 90', value: 8999 },
  { sku: 'NK-AIR-001', brandId: 'brand-nike', barcode: '890100002', description: 'Nike Air Max 90', value: 8999 },
  { sku: 'NK-AIR-002', brandId: 'brand-nike', barcode: '890100003', description: 'Nike Dunk Low', value: 7499 },
  { sku: 'AD-ULTRA-01', brandId: 'brand-adidas', barcode: '890100004', description: 'Adidas Ultraboost', value: 12999 },
  { sku: 'AD-ULTRA-01', brandId: 'brand-adidas', barcode: '890100005', description: 'Adidas Ultraboost', value: 12999 },
  { sku: 'PM-RSX-01', brandId: 'brand-puma', barcode: '890100006', description: 'Puma RS-X', value: 5999 },
])

const carton2Products = makeProducts('CTN-002', [
  { sku: 'NK-AIR-003', brandId: 'brand-nike', barcode: '890200001', description: 'Nike Pegasus 40', value: 9999 },
  { sku: 'NK-AIR-003', brandId: 'brand-nike', barcode: '890200002', description: 'Nike Pegasus 40', value: 9999 },
  { sku: 'AD-SAMBA-01', brandId: 'brand-adidas', barcode: '890200003', description: 'Adidas Samba', value: 8499 },
  { sku: 'AD-SAMBA-01', brandId: 'brand-adidas', barcode: '890200004', description: 'Adidas Samba', value: 8499 },
  { sku: 'PM-SUEDE-01', brandId: 'brand-puma', barcode: '890200005', description: 'Puma Suede Classic', value: 4999 },
  { sku: 'PM-SUEDE-01', brandId: 'brand-puma', barcode: '890200006', description: 'Puma Suede Classic', value: 4999 },
  { sku: 'PM-SUEDE-01', brandId: 'brand-puma', barcode: '890200007', description: 'Puma Suede Classic', value: 4999 },
  { sku: 'NK-AIR-001', brandId: 'brand-nike', barcode: '890200008', description: 'Nike Air Max 90', value: 8999 },
])

const carton3Products = makeProducts('CTN-003', [
  { sku: 'AD-FORUM-01', brandId: 'brand-adidas', barcode: '890300001', description: 'Adidas Forum Low', value: 7999 },
  { sku: 'AD-FORUM-01', brandId: 'brand-adidas', barcode: '890300002', description: 'Adidas Forum Low', value: 7999 },
  { sku: 'AD-FORUM-01', brandId: 'brand-adidas', barcode: '890300003', description: 'Adidas Forum Low', value: 7999 },
  { sku: 'NK-BLAZER-01', brandId: 'brand-nike', barcode: '890300004', description: 'Nike Blazer Mid', value: 6999 },
  { sku: 'NK-BLAZER-01', brandId: 'brand-nike', barcode: '890300005', description: 'Nike Blazer Mid', value: 6999 },
  { sku: 'PM-CA-PRO', brandId: 'brand-puma', barcode: '890300006', description: 'Puma CA Pro', value: 5499 },
  { sku: 'PM-CA-PRO', brandId: 'brand-puma', barcode: '890300007', description: 'Puma CA Pro', value: 5499 },
  { sku: 'PM-CA-PRO', brandId: 'brand-puma', barcode: '890300008', description: 'Puma CA Pro', value: 5499 },
])

const carton4Products = makeProducts('CTN-004', [
  { sku: 'NK-AIR-002', brandId: 'brand-nike', barcode: '890400001', description: 'Nike Dunk Low', value: 7499 },
  { sku: 'NK-AIR-002', brandId: 'brand-nike', barcode: '890400002', description: 'Nike Dunk Low', value: 7499 },
  { sku: 'AD-ULTRA-01', brandId: 'brand-adidas', barcode: '890400003', description: 'Adidas Ultraboost', value: 12999 },
  { sku: 'PM-RSX-01', brandId: 'brand-puma', barcode: '890400004', description: 'Puma RS-X', value: 5999 },
  { sku: 'PM-RSX-01', brandId: 'brand-puma', barcode: '890400005', description: 'Puma RS-X', value: 5999 },
  { sku: 'NK-AIR-001', brandId: 'brand-nike', barcode: '890400006', description: 'Nike Air Max 90', value: 8999 },
  { sku: 'AD-SAMBA-01', brandId: 'brand-adidas', barcode: '890400007', description: 'Adidas Samba', value: 8499 },
  { sku: 'AD-SAMBA-01', brandId: 'brand-adidas', barcode: '890400008', description: 'Adidas Samba', value: 8499 },
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
  return {
    id,
    barcode,
    shipmentId: 'ship-001',
    status,
    assignedWorkerId,
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
  cartons: [
    carton(
      'CTN-001',
      'CTN890001',
      carton1Products,
      'RECEIVED',
      null,
      new Date().toISOString(),
      'bin-dock-1'
    ),
    carton('CTN-002', 'CTN890002', carton2Products),
    carton('CTN-003', 'CTN890003', carton3Products),
    carton('CTN-004', 'CTN890004', carton4Products),
  ],
}

export let rackSlots: RackSlot[] = [
  { id: 'rack-nike-1', label: 'A-1-1-P', brandId: 'brand-nike', capacity: 20, filled: 8, status: 'BRAND_ASSIGNED', zoneType: 'pick' },
  { id: 'rack-adidas-1', label: 'B-1-1-P', brandId: 'brand-adidas', capacity: 20, filled: 5, status: 'BRAND_ASSIGNED', zoneType: 'pick' },
  { id: 'rack-puma-1', label: 'B-2-1-P', brandId: 'brand-puma', capacity: 15, filled: 15, status: 'FULL', zoneType: 'pick' },
  { id: 'rack-empty-1', label: 'A-2-2-P', brandId: null, capacity: 25, filled: 0, status: 'EMPTY', zoneType: 'pick' },
  { id: 'rack-empty-2', label: 'A-3-1-P', brandId: null, capacity: 25, filled: 0, status: 'EMPTY', zoneType: 'pick' },
  { id: 'rack-empty-3', label: 'B-3-1-P', brandId: null, capacity: 30, filled: 0, status: 'EMPTY', zoneType: 'pick' },
  { id: 'rack-gi-1', label: 'D-1', brandId: null, capacity: 100, filled: 0, status: 'EMPTY', zoneType: 'goods_in' },
  { id: 'rack-qa-1', label: 'A-2-1-I', brandId: null, capacity: 40, filled: 2, status: 'BRAND_ASSIGNED', zoneType: 'inspection' },
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
  }
): BinrackRow {
  const locationKind =
    opts?.locationKind ?? (zoneType === 'goods_in' ? 'carton_staging' : 'product_shelf')
  const skuSet = new Set(lineItems.map((l) => l.sku))
  return {
    id,
    locationCode,
    zoneType,
    locationKind,
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
    ['zone-west', 'aisle-dock', 'bay-dock-1'],
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
    ['zone-west', 'aisle-dock', 'bay-dock-2'],
    0,
    0,
    12,
    null,
    ['Dock floor', 'Pallet bay'],
    [],
    { locationKind: 'carton_staging', capacity: { w: 2.4, h: 1.2, d: 1.0 } }
  ),
  bin(
    'bin-b1p',
    'A-1-1-P',
    'pick',
    ['zone-west', 'aisle-a', 'stack-a1'],
    0.17,
    15,
    9000,
    'brand-nike',
    ['Nike'],
    [
      {
        id: 'li-1',
        sku: 'NK-AIR-001',
        barcode: '890100001',
        name: 'Nike Air Max 90',
        batchNo: null,
        status: 'Available',
        fifo: 1,
        quantity: 5,
        value: 17.82,
        brandId: 'brand-nike',
      },
      {
        id: 'li-2',
        sku: 'NK-AIR-002',
        barcode: '890100003',
        name: 'Nike Dunk Low',
        batchNo: '+',
        status: 'Available',
        fifo: 2,
        quantity: 10,
        value: 42.5,
        brandId: 'brand-nike',
      },
    ]
  ),
  bin(
    'bin-b1qa',
    'A-2-1-I',
    'inspection',
    ['zone-west', 'aisle-a', 'stack-a2'],
    0.34,
    30,
    9000,
    null,
    [],
    [
      {
        id: 'li-3',
        sku: 'AD-SAMBA-01',
        barcode: '890200003',
        name: 'Adidas Samba',
        batchNo: null,
        status: 'Available',
        fifo: 1,
        quantity: 30,
        value: 88.2,
        brandId: 'brand-adidas',
      },
    ]
  ),
  bin(
    'bin-b2p',
    'B-1-1-P',
    'pick',
    ['zone-west', 'aisle-b', 'stack-b1'],
    0.26,
    23,
    9000,
    'brand-adidas',
    ['Adidas'],
    [
      {
        id: 'li-4',
        sku: 'AD-ULTRA-01',
        barcode: '890100004',
        name: 'Adidas Ultraboost',
        batchNo: null,
        status: 'Available',
        fifo: 1,
        quantity: 23,
        value: 61.0,
        brandId: 'brand-adidas',
      },
    ]
  ),
  bin(
    'bin-b2qa',
    'B-2-2-I',
    'inspection',
    ['zone-west', 'aisle-b', 'stack-b2'],
    0,
    0,
    9000,
    null,
    [],
    []
  ),
  bin(
    'bin-b4p',
    'B-2-1-P',
    'pick',
    ['zone-west', 'aisle-b', 'stack-b2'],
    1.63,
    147,
    9000,
    'brand-puma',
    ['Puma'],
    [
      {
        id: 'li-5',
        sku: 'PM-RSX-01',
        barcode: '890100006',
        name: 'Puma RS-X',
        batchNo: null,
        status: 'Available',
        fifo: 3,
        quantity: 147,
        value: 210.4,
        brandId: 'brand-puma',
      },
    ]
  ),
  bin(
    'bin-b5p',
    'A-2-2-P',
    'pick',
    ['zone-west', 'aisle-a', 'stack-a2'],
    0,
    0,
    9000,
    null,
    [],
    []
  ),
]

export let stockMoves: StockMove[] = [
  {
    id: 'mv-1',
    username: 'Ravi Putaway',
    workerId: 'w-put-1',
    sku: '10001',
    batchNo: null,
    fromBinrackId: 'bin-b1p',
    fromLabel: 'A-1-1-P',
    fromZone: 'pick',
    toBinrackId: 'bin-b1qa',
    toLabel: 'A-2-1-I',
    toZone: 'inspection',
    quantity: 5,
    state: 'Open',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mv-2',
    username: 'Priya Putaway',
    workerId: 'w-put-2',
    sku: '10003',
    batchNo: null,
    fromBinrackId: 'bin-b2p',
    fromLabel: 'B-1-1-P',
    fromZone: 'pick',
    toBinrackId: 'bin-b1qa',
    toLabel: 'A-2-1-I',
    toZone: 'inspection',
    quantity: 30,
    state: 'Open',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mv-3',
    username: 'Ravi Putaway',
    workerId: 'w-put-1',
    sku: '10005',
    batchNo: null,
    fromBinrackId: 'bin-b4p',
    fromLabel: 'B-2-1-P',
    fromZone: 'pick',
    toBinrackId: null,
    toLabel: null,
    toZone: null,
    quantity: 5,
    state: 'Open',
    createdAt: new Date().toISOString(),
  },
]

export function delay(ms = 250): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function refreshWorkerLoads() {
  for (const w of workers) {
    if (w.role !== 'PUTAWAY') {
      w.openCartonCount = 0
      continue
    }
    w.openCartonCount = shipment.cartons.filter(
      (c) =>
        c.assignedWorkerId === w.id &&
        (c.status === 'ASSIGNED' || c.status === 'OPENED' || c.status === 'PUTAWAY_IN_PROGRESS')
    ).length
  }
}
