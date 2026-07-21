import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inboundService, warehouseService } from '@/services/inbound.service'
import { useAuthStore } from '@/store/useAuthStore'
import type { CapacityRule, MoveState, ZoneType } from '@/types/inbound'

export function useShipments() {
  return useQuery({
    queryKey: ['shipments'],
    queryFn: () => inboundService.listShipments(),
  })
}

export function useReceivedCartons() {
  return useQuery({
    queryKey: ['cartons', 'received'],
    queryFn: () => inboundService.getReceivedCartons(),
    refetchInterval: 5000,
  })
}

export function useStagedProducts() {
  return useQuery({
    queryKey: ['products', 'staged'],
    queryFn: () => inboundService.getStagedProducts(),
    refetchInterval: 4000,
  })
}

export function useTrolleyBags() {
  return useQuery({
    queryKey: ['trolleys'],
    queryFn: () => inboundService.listTrolleyBags(),
    refetchInterval: 4000,
  })
}

export function useMyAssignedProducts(workerId: string | null | undefined, asSupervisor = false) {
  return useQuery({
    queryKey: ['products', 'assigned', workerId, asSupervisor],
    queryFn: () => inboundService.getMyAssignedProducts(workerId ?? '', asSupervisor),
    enabled: asSupervisor || !!workerId,
    refetchInterval: 4000,
  })
}

export function useWorkers() {
  return useQuery({
    queryKey: ['workers'],
    queryFn: () => inboundService.listWorkers(),
  })
}

export function useRacks() {
  return useQuery({
    queryKey: ['racks'],
    queryFn: () => inboundService.getRacks(),
  })
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: () => inboundService.getBrands(),
  })
}

export function useBinracks(filters: {
  search: string
  zoneTypes: ZoneType[]
  capacityRules: CapacityRule[]
  hierarchyIds: string[]
}) {
  return useQuery({
    queryKey: ['binracks', filters],
    queryFn: () => warehouseService.listBinracks(filters),
  })
}

export function useHierarchy() {
  return useQuery({
    queryKey: ['hierarchy'],
    queryFn: () => warehouseService.getHierarchy(),
  })
}

export function useMoves(filters: {
  search: string
  states?: MoveState[]
  fromZones?: ZoneType[]
  toZones?: ZoneType[]
  usernames?: string[]
}) {
  return useQuery({
    queryKey: ['moves', filters],
    queryFn: () => warehouseService.listMoves(filters),
    refetchInterval: 10000,
  })
}

export function useMoveUsernames() {
  return useQuery({
    queryKey: ['move-usernames'],
    queryFn: () => warehouseService.listMoveUsernames(),
  })
}

export function useInvalidateInbound() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['shipments'] })
    void qc.invalidateQueries({ queryKey: ['cartons'] })
    void qc.invalidateQueries({ queryKey: ['products'] })
    void qc.invalidateQueries({ queryKey: ['trolleys'] })
    void qc.invalidateQueries({ queryKey: ['workers'] })
    void qc.invalidateQueries({ queryKey: ['worker'] })
    void qc.invalidateQueries({ queryKey: ['racks'] })
    void qc.invalidateQueries({ queryKey: ['binracks'] })
    void qc.invalidateQueries({ queryKey: ['moves'] })
  }
}

export function useAssignWorkerJob() {
  const invalidate = useInvalidateInbound()
  const supervisorId = useAuthStore.getState().user?.workerId
  return useMutation({
    mutationFn: ({
      workerId,
      role,
    }: {
      workerId: string
      role: 'DOCK_RECEIVER' | 'UNPACKER' | 'PUTAWAY'
    }) => inboundService.assignWorkerJob(workerId, role, supervisorId),
    onSuccess: () => invalidate(),
  })
}

export function useWorker(workerId: string | null | undefined) {
  return useQuery({
    queryKey: ['worker', workerId],
    queryFn: () => inboundService.getWorker(workerId!),
    enabled: !!workerId,
    refetchInterval: 3000,
  })
}

export function useReceiveCarton() {
  const invalidate = useInvalidateInbound()
  return useMutation({
    mutationFn: ({ barcode, workerId }: { barcode: string; workerId?: string | null }) =>
      inboundService.receiveCarton(barcode, workerId),
    onSuccess: () => invalidate(),
  })
}

export function useOpenReceivedCarton() {
  const invalidate = useInvalidateInbound()
  return useMutation({
    mutationFn: ({ barcode, unpackerId }: { barcode: string; unpackerId?: string | null }) =>
      inboundService.openReceivedCarton(barcode, unpackerId),
    onSuccess: () => invalidate(),
  })
}

export function useScanProductToStaging() {
  const invalidate = useInvalidateInbound()
  return useMutation({
    mutationFn: (input: {
      rawScan: string
      cartonId: string
      containerLabel?: string | null
      unpackerId?: string | null
    }) =>
      inboundService.scanProductToStaging(
        input.rawScan,
        input.cartonId,
        input.containerLabel,
        input.unpackerId
      ),
    onSuccess: () => invalidate(),
  })
}

export function useSendProductToInspection() {
  const invalidate = useInvalidateInbound()
  return useMutation({
    mutationFn: (input: {
      rawScan: string
      cartonId: string
      unpackerId?: string | null
    }) =>
      inboundService.sendProductToInspection(input.rawScan, input.cartonId, input.unpackerId),
    onSuccess: () => invalidate(),
  })
}

export function useAssignStagedProducts() {
  const invalidate = useInvalidateInbound()
  const supervisorId = useAuthStore.getState().user?.workerId
  return useMutation({
    mutationFn: (input: { productIds: string[]; workerId: string; rackSlotId: string }) =>
      inboundService.assignStagedProducts({ ...input, supervisorId }),
    onSuccess: () => invalidate(),
  })
}
