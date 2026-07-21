import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Boxes,
  ChartColumn,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  PackageOpen,
  PackageSearch,
  Percent,
  Truck,
  UserCheck,
  Users,
  Warehouse,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorker } from '@/hooks/useInbound'
import { INBOUND_ROLES } from '@/routes/roleRoutes'
import { useEffect } from 'react'
import { ToastHost } from '@/components/ui/ToastHost'

type NavItem = {
  to: string
  label: string
  icon: typeof Truck
  roles?: string[]
}

const NAV: NavItem[] = [
  { to: '/inbound/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['WMS_SUPERVISOR'] },
  { to: '/inbound/dock-receive', label: 'Dock Receiving', icon: Truck, roles: ['DOCK_RECEIVER', 'WMS_SUPERVISOR'] },
  { to: '/inbound/unpack', label: 'Unpack', icon: PackageOpen, roles: ['UNPACKER', 'WMS_SUPERVISOR'] },
  {
    to: '/inbound/assign-putaway',
    label: 'Assign putaway',
    icon: UserCheck,
    roles: ['WMS_SUPERVISOR'],
  },
  { to: '/inbound/putaway', label: 'Putaway', icon: Package, roles: ['PUTAWAY', 'WMS_SUPERVISOR'] },
  { to: '/warehouse', label: 'Locations', icon: Warehouse, roles: ['WMS_SUPERVISOR'] },
  { to: '/warehouse/moves', label: 'Moves', icon: ArrowLeftRight, roles: ['WMS_SUPERVISOR'] },
  { to: '/inventory', label: 'Inventory', icon: PackageSearch, roles: ['WMS_SUPERVISOR'] },
  { to: '/inventory/utilization', label: 'Utilization', icon: Percent, roles: ['WMS_SUPERVISOR'] },
  { to: '/inventory/incoming', label: 'Incoming', icon: Inbox, roles: ['WMS_SUPERVISOR'] },
  { to: '/inbound/workers', label: 'Workers', icon: Users, roles: ['WMS_SUPERVISOR'] },
  { to: '/inbound/team-work', label: 'Team work', icon: ClipboardList, roles: ['WMS_SUPERVISOR'] },
  { to: '/inbound/my-work', label: 'My work', icon: ChartColumn, roles: [...INBOUND_ROLES] },
]

export function AppShell() {
  const { user, logout, hasAnyRole } = useAuthStore()
  const navigate = useNavigate()
  const workerQ = useWorker(user?.workerId)
  const worker = workerQ.data
  const setUserRoles = useAuthStore((s) => s.setUserRoles)

  useEffect(() => {
    if (!worker || !user) return
    if (worker.role === 'WMS_SUPERVISOR') return
    if (user.userType === 'SUPER_ADMIN') return
    if (user.roles?.[0] !== worker.role) setUserRoles([worker.role])
  }, [worker, user, setUserRoles])

  const isSupervisor = user?.userType === 'SUPER_ADMIN' || hasAnyRole(['WMS_SUPERVISOR'])

  const visible = NAV.filter((item) => {
    if (!item.roles) return true
    if (isSupervisor) return true
    return hasAnyRole(item.roles)
  })

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-white">
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-4 py-4">
          <Boxes className="h-6 w-6 text-primary-400" />
          <div>
            <p className="text-sm font-bold">Upbox WMS</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Admin portal</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {visible.map((item) => {
            const Icon = item.icon
            const end = item.to === '/warehouse' || item.to === '/inventory'
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={end}
                className={({ isActive }) =>
                  `flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-3">
          <p className="truncate text-xs font-semibold text-white">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-[11px] text-slate-400">{user?.roles?.[0] ?? user?.email}</p>

          <button
            type="button"
            className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  )
}
