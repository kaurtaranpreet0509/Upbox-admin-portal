import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Boxes,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ScanLine,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useEndShift, useStartShift, useWorker } from '@/hooks/useInbound'
import { INBOUND_ROLES } from '@/routes/roleRoutes'
import { formatDuration, isOnShift, shiftDurationMs } from '@/lib/shifts'
import { cn } from '@/lib/cn'
import { useEffect, useState } from 'react'

type NavItem = {
  to: string
  label: string
  icon: typeof Truck
  roles?: string[]
}

const NAV: NavItem[] = [
  { to: '/inbound/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['WMS_SUPERVISOR'] },
  { to: '/inbound/dock-receive', label: 'Dock Receiving', icon: Truck, roles: ['DOCK_RECEIVER', 'WMS_SUPERVISOR'] },
  { to: '/inbound/sort-assign', label: 'Sort & Assign', icon: ScanLine, roles: ['SORTER', 'WMS_SUPERVISOR'] },
  { to: '/inbound/putaway', label: 'Putaway', icon: Package, roles: ['PUTAWAY', 'WMS_SUPERVISOR'] },
  { to: '/warehouse', label: 'Locations', icon: Warehouse, roles: ['WMS_SUPERVISOR'] },
  { to: '/warehouse/moves', label: 'Moves', icon: ArrowLeftRight, roles: ['WMS_SUPERVISOR'] },
  { to: '/inbound/workers', label: 'Workers', icon: Users, roles: ['WMS_SUPERVISOR'] },
  { to: '/inbound/team-work', label: 'Team work', icon: ClipboardList, roles: ['WMS_SUPERVISOR'] },
  { to: '/inbound/my-work', label: 'My work', icon: ChartColumn, roles: [...INBOUND_ROLES] },
]

export function AppShell() {
  const { user, logout, hasAnyRole } = useAuthStore()
  const navigate = useNavigate()
  const workerQ = useWorker(user?.workerId)
  const startShift = useStartShift()
  const endShift = useEndShift()
  const [now, setNow] = useState(() => Date.now())
  const [shiftBusy, setShiftBusy] = useState(false)

  const worker = workerQ.data
  const onShift = worker ? isOnShift(worker) : false
  const openShift = worker?.shifts.find((s) => !s.endedAt)
  const setUserRoles = useAuthStore((s) => s.setUserRoles)

  useEffect(() => {
    if (!onShift) return
    const t = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(t)
  }, [onShift])

  // Keep session job in sync when supervisor reassigns this account
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

  const toggleShift = async () => {
    if (!user?.workerId || shiftBusy) return
    setShiftBusy(true)
    try {
      if (onShift) {
        await endShift.mutateAsync(user.workerId)
        navigate('/inbound/my-work', { state: { needShift: true } })
      } else {
        await startShift.mutateAsync(user.workerId)
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Shift update failed')
    } finally {
      setShiftBusy(false)
    }
  }

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
            const end = item.to === '/warehouse'
            const alwaysFull =
              item.to === '/inbound/my-work' ||
              item.to === '/inbound/workers' ||
              item.to === '/inbound/team-work'
            const viewOnly = !onShift && !alwaysFull
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : viewOnly
                        ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {viewOnly ? (
                  <span className="text-[10px] font-bold uppercase text-slate-600">View</span>
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-3">
          <p className="truncate text-xs font-semibold text-white">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-[11px] text-slate-400">{user?.roles?.[0] ?? user?.email}</p>

          {user?.workerId ? (
            <div className="mt-2 rounded-lg border border-slate-700 bg-slate-800/60 p-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wide',
                    onShift ? 'text-emerald-400' : 'text-slate-400'
                  )}
                >
                  {onShift ? 'On shift' : 'Off shift'}
                </span>
                {onShift && openShift ? (
                  <span className="text-[10px] text-slate-400">
                    {formatDuration(shiftDurationMs(openShift, now))}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={shiftBusy || workerQ.isLoading}
                onClick={() => void toggleShift()}
                className={cn(
                  'mt-1.5 w-full cursor-pointer rounded-md px-2 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40',
                  onShift
                    ? 'bg-rose-600 text-white hover:bg-rose-500'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                )}
              >
                {onShift ? 'End shift' : 'Start shift'}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="cursor-pointer mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
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
    </div>
  )
}
