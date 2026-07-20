import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { roleHomePath } from '@/routes/roleRoutes'

export function InboundRoleRouter() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={roleHomePath(user.roles ?? [])} replace />
}
