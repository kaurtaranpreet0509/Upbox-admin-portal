import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RestockRequest } from '@/types/inventory'

type SendRestockInput = Omit<RestockRequest, 'id' | 'status' | 'createdAt'>

type RestockState = {
  requests: RestockRequest[]
  sendRestockRequest: (input: SendRestockInput) => RestockRequest
  hasPendingRequest: (sku: string) => boolean
  getRequestForSku: (sku: string) => RestockRequest | undefined
  listRestockRequests: () => RestockRequest[]
}

export const useRestockStore = create<RestockState>()(
  persist(
    (set, get) => ({
      requests: [],
      sendRestockRequest(input) {
        const existing = get().requests.find((r) => r.sku === input.sku && r.status === 'sent')
        if (existing) return existing

        const request: RestockRequest = {
          ...input,
          id: `rr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          status: 'sent',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ requests: [request, ...s.requests] }))
        return request
      },
      hasPendingRequest(sku) {
        return get().requests.some((r) => r.sku === sku && r.status === 'sent')
      },
      getRequestForSku(sku) {
        return get().requests.find((r) => r.sku === sku && r.status === 'sent')
      },
      listRestockRequests() {
        return get().requests
      },
    }),
    { name: 'upbox-admin-inventory-restock' }
  )
)
