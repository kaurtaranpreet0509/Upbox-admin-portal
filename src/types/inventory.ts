import type { LocationKind, ZoneType } from '@/types/inbound'

export type { LocationKind, ZoneType }

export type StockHealth = 'healthy' | 'low' | 'critical' | 'out' | 'incoming_only'
export type SkuSource = 'seller_portal' | 'inbound' | 'both'
export type IncomingOrderStatus = 'expected' | 'in_transit' | 'at_dock' | 'receiving' | 'partial'
export type LineStatus = 'Available' | 'Reserved' | 'Damaged'
export type UtilRackStatus = 'EMPTY' | 'BRAND_ASSIGNED' | 'FULL' | 'NEAR_FULL'

export interface OnboardedBrand {
  id: string
  name: string
  sellerName: string
  status: 'active' | 'onboarding' | 'paused'
  onboardedAt: string
  logoInitials: string
}

export interface CatalogSku {
  id: string
  sku: string
  name: string
  brandId: string
  barcode: string
  asin?: string
  fnsku?: string
  unitValue: number
  reorderPoint: number
  source: SkuSource
  status: 'active' | 'inactive'
}

export interface InventoryLineItem {
  id: string
  sku: string
  barcode: string
  name: string
  batchNo: string | null
  status: LineStatus
  quantity: number
  brandId: string
}

/** Inventory/map location view — codes use Quadrant.Aisle.Rack.Bay.Shelf */
export interface InventoryLocation {
  id: string
  locationCode: string
  zoneType: ZoneType
  locationKind: LocationKind
  hierarchyPath: string[]
  hierarchyLabels: string[]
  brandId: string | null
  maxUnits: number
  filledUnits: number
  fillPercent: number
  lineItems: InventoryLineItem[]
  scanBarcode: string | null
}

export interface IncomingUnit {
  sku: string
  brandId: string
  name: string
  orderId: string
  status: 'pending' | 'received' | 'staged'
}

export interface IncomingOrderSeed {
  id: string
  poNumber: string
  sellerName: string
  status: IncomingOrderStatus
  expectedAt: string
  source: 'seller_fbu' | 'purchase_order'
  cartonCount: number
  units: IncomingUnit[]
}

export interface SkuLocationStock {
  binrackId: string
  locationCode: string
  zoneType: ZoneType
  hierarchyLabel: string
  quantity: number
  reserved: number
  available: number
  status: LineStatus
  batchNo: string | null
  fillPercent: number
}

export interface SkuInventoryRow {
  catalogId: string
  sku: string
  name: string
  brandId: string
  brandName: string
  barcode: string
  asin?: string
  fnsku?: string
  unitValue: number
  reorderPoint: number
  source: SkuSource
  onHand: number
  reserved: number
  available: number
  incoming: number
  locationCount: number
  primaryLocation: string | null
  locations: SkuLocationStock[]
  health: StockHealth
  status: 'active' | 'inactive'
}

export interface InventorySummary {
  brandCount: number
  skuCount: number
  unitsOnHand: number
  unitsIncoming: number
  lowStockCount: number
  outOfStockCount: number
  avgRackUtilization: number
  racksNearFull: number
  emptyRacks: number
}

export interface RackUtilizationRow {
  id: string
  label: string
  locationCode: string
  zoneType: ZoneType
  brandId: string | null
  brandName: string | null
  capacity: number
  filled: number
  fillPercent: number
  skuCount: number
  status: UtilRackStatus
  hierarchyLabel: string
}

export interface IncomingOrderLine {
  sku: string
  name: string
  brandId: string
  brandName: string
  qtyExpected: number
  qtyReceived: number
  qtyPending: number
}

export interface IncomingOrder {
  id: string
  poNumber: string
  sellerName: string
  brandIds: string[]
  brandNames: string[]
  status: IncomingOrderStatus
  expectedAt: string
  cartonCount: number
  unitsExpected: number
  unitsReceived: number
  unitsPending: number
  lines: IncomingOrderLine[]
  source: 'seller_fbu' | 'purchase_order'
}

export const ZONE_LABELS: Record<ZoneType, string> = {
  goods_in: 'Goods In',
  pick: 'Pick',
  inspection: 'Inspection',
}

export const HEALTH_LABELS: Record<StockHealth, string> = {
  healthy: 'Healthy',
  low: 'Low',
  critical: 'Critical',
  out: 'Out of stock',
  incoming_only: 'Incoming only',
}

export interface RestockRequest {
  id: string
  sku: string
  skuName: string
  brandId: string
  brandName: string
  sellerName: string
  onHand: number
  available: number
  reorderPoint: number
  health: 'low' | 'critical'
  note: string
  status: 'sent'
  createdAt: string
}

export function needsSellerUpdate(health: StockHealth): health is 'low' | 'critical' {
  return health === 'low' || health === 'critical'
}
