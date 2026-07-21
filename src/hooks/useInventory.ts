import { useQuery } from '@tanstack/react-query'
import { inventoryService, type ListSkusFilters } from '@/services/inventory.service'
import type { StockHealth } from '@/types/inventory'

export function useBrands() {
  return useQuery({
    queryKey: ['inventory', 'brands'],
    queryFn: () => inventoryService.listBrands(),
  })
}

export function useInventorySummary(brandId: string | 'all' = 'all') {
  return useQuery({
    queryKey: ['inventory', 'summary', brandId],
    queryFn: () => inventoryService.getSummary(brandId),
  })
}

export function useInventorySkus(filters: ListSkusFilters) {
  return useQuery({
    queryKey: ['inventory', 'skus', filters],
    queryFn: () => inventoryService.listSkus(filters),
  })
}

export function useSkuDetail(sku: string | null) {
  return useQuery({
    queryKey: ['inventory', 'sku', sku],
    queryFn: () => inventoryService.getSku(sku!),
    enabled: !!sku,
  })
}

export function useUtilization(filters: {
  zoneType?: string | 'all'
  brandId?: string | 'all'
  band?: 'all' | 'empty' | 'mid' | 'near_full' | 'full'
}) {
  return useQuery({
    queryKey: ['inventory', 'utilization', filters],
    queryFn: () => inventoryService.listUtilization(filters),
  })
}

export function useIncomingOrders(brandId: string | 'all' = 'all') {
  return useQuery({
    queryKey: ['inventory', 'incoming', brandId],
    queryFn: () => inventoryService.listIncoming(brandId),
  })
}

export function useInventoryLocations(search: string) {
  return useQuery({
    queryKey: ['inventory', 'locations', search],
    queryFn: () => inventoryService.listLocations(search),
  })
}

export type { StockHealth }
