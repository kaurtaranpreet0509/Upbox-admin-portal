export type CartonStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'OPENED'
  | 'UNPACK_IN_PROGRESS'
  | 'PUTAWAY_IN_PROGRESS'
  | 'COMPLETE'

export type ProductStatus = 'PENDING' | 'STAGED' | 'ASSIGNED' | 'PLACED' | 'DAMAGED'
export type RackStatus = 'EMPTY' | 'BRAND_ASSIGNED' | 'FULL'
export type ZoneType = 'goods_in' | 'pick' | 'inspection'
export type WorkerRole = 'DOCK_RECEIVER' | 'UNPACKER' | 'PUTAWAY' | 'WMS_SUPERVISOR'
export type CapacityOp = 'eq' | 'lt' | 'gt' | 'lte' | 'gte'
export type MoveState = 'Open' | 'In Progress' | 'Complete'

export interface Brand {
  id: string
  name: string
}

export interface CapacityRule {
  op: CapacityOp
  value: number
  enabled: boolean
}

export type HierarchyNodeType =
  | 'warehouse'
  | 'quadrant'
  | 'aisle'
  | 'rack'
  | 'bay'
  | 'shelf'
  | 'zone'
  | 'stack'

export interface HierarchyNode {
  id: string
  label: string
  type: HierarchyNodeType
  children?: HierarchyNode[]
}

export interface BinrackLineItem {
  id: string
  sku: string
  barcode: string
  name: string
  batchNo: string | null
  status: 'Available' | 'Reserved' | 'Damaged'
  fifo: number
  quantity: number
  value: number
  brandId: string
}

/** Whole master cartons staged on a Goods In floor/bay (not SKU shelves). */
export interface StagedCartonSummary {
  id: string
  barcode: string
  status: CartonStatus
  productCount: number
  receivedAt: string | null
}

export type LocationKind = 'product_shelf' | 'carton_staging' | 'inspection_hold'

export interface BinrackRow {
  id: string
  /** Human-readable code, e.g. W.A.R1.B1.3 for pick shelves */
  locationCode: string
  zoneType: ZoneType
  /** Goods In = carton floor/bay; Pick/Inspection = product shelves */
  locationKind: LocationKind
  /** Scannable barcode for pick shelves; null for dock / inspection */
  scanBarcode: string | null
  storageGroups: string[]
  capacity: { w: number; h: number; d: number }
  fillPercent: number
  skuCount: number
  itemQty: number
  hierarchyPath: string[]
  brandId: string | null
  maxUnits: number
  filledUnits: number
  lineItems: BinrackLineItem[]
  stagedCartons: StagedCartonSummary[]
}

export interface RackSlot {
  id: string
  /** Location code: Quadrant.Aisle.Rack.Bay.Shelf e.g. W.A.R1.B1.3 */
  label: string
  /** Scannable barcode (pick racks). Null for dock staging slots. */
  barcode: string | null
  brandId: string | null
  capacity: number
  filled: number
  status: RackStatus
  zoneType: ZoneType
}

export interface ProductUnit {
  id: string
  barcode: string
  sku: string
  description: string
  brandId: string
  cartonId: string
  rackSlotId: string | null
  status: ProductStatus
  unitValue: number
  /** Bag / trolley label while aside after unpack */
  stagingContainerLabel: string | null
  /** Putaway worker after supervisor assign */
  assignedWorkerId: string | null
  /** Target rack after supervisor assign */
  assignedRackSlotId: string | null
}

export interface MasterCarton {
  id: string
  barcode: string
  shipmentId: string
  status: CartonStatus
  assignedWorkerId: string | null
  /** Single brand for all products in this carton */
  brandId: string | null
  productCount: number
  receivedAt: string | null
  /** Goods In dock bay where the whole carton sits after receive */
  stagingBinrackId: string | null
  products: ProductUnit[]
}

export interface InboundShipment {
  id: string
  poNumber: string
  supplierName: string
  status: string
  expectedAt: string
  cartons: MasterCarton[]
}

export type WorkEventKind =
  | 'carton_received'
  | 'product_staged'
  | 'product_damaged'
  | 'products_assigned'
  | 'product_placed'
  | 'carton_completed'

export type WorkPeriod = 'today' | 'week' | 'month'

export interface WorkActivityEvent {
  id: string
  kind: WorkEventKind
  at: string
  detail?: string
}

export interface WorkerWorkStats {
  cartonsReceived: number
  productsStaged: number
  productsDamaged: number
  productsAssigned: number
  productsPlaced: number
  cartonsCompleted: number
}

export interface WarehouseWorker {
  id: string
  name: string
  email: string
  role: WorkerRole
  /** Putaway: count of products assigned and not yet placed */
  openProductCount: number
  /** Timed activity log — filter by today / week / month */
  activity: WorkActivityEvent[]
}

export interface StockMove {
  id: string
  username: string
  workerId: string
  sku: string
  batchNo: string | null
  fromBinrackId: string
  fromLabel: string
  fromZone: ZoneType
  toBinrackId: string | null
  toLabel: string | null
  toZone: ZoneType | null
  quantity: number
  state: MoveState
  createdAt: string
}

export interface ScanProductResult {
  product: ProductUnit
  brand: Brand
  targetRack: RackSlot | null
}

export const CAPACITY_OPS: { op: CapacityOp; label: string }[] = [
  { op: 'eq', label: 'Equal' },
  { op: 'lt', label: 'Less' },
  { op: 'gt', label: 'Greater' },
  { op: 'lte', label: 'Less or equal' },
  { op: 'gte', label: 'Greater or equal' },
]

export const ZONE_LABELS: Record<ZoneType, string> = {
  goods_in: 'Goods In',
  pick: 'Pick',
  inspection: 'Inspection',
}
