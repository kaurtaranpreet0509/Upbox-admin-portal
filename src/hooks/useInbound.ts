import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inboundService, warehouseService } from '@/services/inbound.service'
import { useAuthStore } from '@/store/useAuthStore'
import type { CapacityRule, ZoneType } from '@/types/inbound'

export function useShipments() {
  return useQuery({
    queryKey: ['shipments'],
    queryFn: () => inboundService.listShipments(),
  })
}

export function useUnassignedCartons() {
  return useQuery({
    queryKey: ['cartons', 'unassigned'],
    queryFn: () => inboundService.getUnassignedCartons(),
    refetchInterval: 5000,
  })
}

export function useAssignedCartons() {
  return useQuery({
    queryKey: ['cartons', 'assigned'],
    queryFn: () => inboundService.getAssignedCartons(),
    refetchInterval: 5000,
  })
}

export function useMyCartons(workerId: string | null | undefined, asSupervisor = false) {
  return useQuery({
    queryKey: ['cartons', 'mine', workerId, asSupervisor],
    queryFn: () => inboundService.getMyCartons(workerId ?? '', asSupervisor),
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

export function useMoves(search: string) {
  return useQuery({
    queryKey: ['moves', search],
    queryFn: () => warehouseService.listMoves(search),
    refetchInterval: 10000,
  })
}

export function useInvalidateInbound() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['shipments'] })
    void qc.invalidateQueries({ queryKey: ['cartons'] })
    void qc.invalidateQueries({ queryKey: ['workers'] })
    void qc.invalidateQueries({ queryKey: ['worker'] })
    void qc.invalidateQueries({ queryKey: ['racks'] })
    void qc.invalidateQueries({ queryKey: ['binracks'] })
    void qc.invalidateQueries({ queryKey: ['moves'] })
  }
}

export function useStartShift() {
  const invalidate = useInvalidateInbound()
  return useMutation({
    mutationFn: (workerId: string) => inboundService.startShift(workerId),
    onSuccess: () => invalidate(),
  })
}

export function useEndShift() {
  const invalidate = useInvalidateInbound()
  return useMutation({
    mutationFn: (workerId: string) => inboundService.endShift(workerId),
    onSuccess: () => invalidate(),
  })
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
      role: 'DOCK_RECEIVER' | 'SORTER' | 'PUTAWAY'
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

export function useAssignCarton() {
  const invalidate = useInvalidateInbound()
  return useMutation({
    mutationFn: ({
      cartonId,
      workerId,
      sorterId,
    }: {
      cartonId: string
      workerId: string
      sorterId?: string | null
    }) => inboundService.assignCarton(cartonId, workerId, sorterId),
    onSuccess: () => invalidate(),
  })
}
