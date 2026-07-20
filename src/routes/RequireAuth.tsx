import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { INBOUND_ROLES } from '@/routes/roleRoutes'

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children ? <>{children}</> : <Outlet />
}

export function RequireInboundRole({ roles }: { roles: string[] }) {
  const { isAuthenticated, hasAnyRole, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.userType === 'SUPER_ADMIN' || hasAnyRole(['WMS_SUPERVISOR', ...roles])) {
    return <Outlet />
  }

  if (!hasAnyRole([...INBOUND_ROLES])) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Navigate to="/unauthorized" replace />
}
