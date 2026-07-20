export type CartonStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'ASSIGNED'
  | 'OPENED'
  | 'PUTAWAY_IN_PROGRESS'
  | 'COMPLETE'

export type ProductStatus = 'PENDING' | 'SCANNED' | 'PLACED'
export type RackStatus = 'EMPTY' | 'BRAND_ASSIGNED' | 'FULL'
export type ZoneType = 'goods_in' | 'pick' | 'inspection'
export type WorkerRole = 'DOCK_RECEIVER' | 'SORTER' | 'PUTAWAY' | 'WMS_SUPERVISOR'
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

export interface HierarchyNode {
  id: string
  label: string
  type: 'zone' | 'aisle' | 'stack'
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

export type LocationKind = 'product_shelf' | 'carton_staging'

export interface BinrackRow {
  id: string
  locationCode: string
  zoneType: ZoneType
  /** Goods In = carton floor/bay; Pick/Inspection = product shelves */
  locationKind: LocationKind
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
  label: string
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
}

export interface MasterCarton {
  id: string
  barcode: string
  shipmentId: string
  status: CartonStatus
  assignedWorkerId: string | null
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
  | 'carton_assigned'
  | 'product_placed'
  | 'carton_completed'

export type WorkPeriod = 'today' | 'week' | 'month'

export interface WorkActivityEvent {
  id: string
  kind: WorkEventKind
  at: string
  detail?: string
}

export interface ShiftRecord {
  id: string
  startedAt: string
  endedAt: string | null
}

export interface WorkerWorkStats {
  cartonsReceived: number
  cartonsAssigned: number
  productsPlaced: number
  cartonsCompleted: number
}

export interface WarehouseWorker {
  id: string
  name: string
  email: string
  role: WorkerRole
  /** Putaway queue only — kept for SortAssign capacity chips */
  openCartonCount: number
  /** Timed activity log — filter by today / week / month */
  activity: WorkActivityEvent[]
  /** Current open shift start, or null if clocked out */
  shiftStartedAt: string | null
  /** Completed + current shifts */
  shifts: ShiftRecord[]
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
