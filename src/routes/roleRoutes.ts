export const INBOUND_ROLES = ['DOCK_RECEIVER', 'UNPACKER', 'PUTAWAY', 'WMS_SUPERVISOR'] as const

export function roleHomePath(roles: string[]): string {
  if (roles.includes('WMS_SUPERVISOR')) return '/inbound/dashboard'
  if (roles.includes('DOCK_RECEIVER')) return '/inbound/dock-receive'
  if (roles.includes('UNPACKER')) return '/inbound/unpack'
  if (roles.includes('PUTAWAY')) return '/inbound/putaway'
  return '/unauthorized'
}
