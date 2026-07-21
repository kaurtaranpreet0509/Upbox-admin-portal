import type { WorkerRole } from '@/types/inbound'

export function roleJobLabel(role: string): string {
  switch (role) {
    case 'DOCK_RECEIVER':
      return 'Dock'
    case 'UNPACKER':
      return 'Unpack'
    case 'PUTAWAY':
      return 'Putaway'
    case 'WMS_SUPERVISOR':
      return 'Supervisor'
    default:
      return role
  }
}

export const ASSIGNABLE_JOBS: { value: Exclude<WorkerRole, 'WMS_SUPERVISOR'>; label: string }[] = [
  { value: 'DOCK_RECEIVER', label: 'Dock Receiving' },
  { value: 'UNPACKER', label: 'Unpack' },
  { value: 'PUTAWAY', label: 'Putaway' },
]
