export type DeviceType = 'mobile' | 'desktop' | 'tablet'

export interface AuthUserProfile {
  username: string
  email: string
  userType: 'SUPER_ADMIN' | 'TENANT_USER'
  firstName?: string | null
  lastName?: string | null
  tenantId?: string | null
  tenantName?: string | null
  roles?: string[]
  permissions?: string[]
  workerId?: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  idToken: string
  expiresIn: number
  expiresAt: number
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  idToken: string
  expiresIn: number
  sessionId: string
  user: AuthUserProfile
}

export interface AuthState {
  user: AuthUserProfile | null
  tokens: AuthTokens | null
  sessionId: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthActions {
  login: (response: LoginResponse) => void
  logout: () => Promise<void>
  setLoading: (loading: boolean) => void
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  /** Sync floor job after supervisor reassignment (same session). */
  setUserRoles: (roles: string[]) => void
}

export type AuthStore = AuthState & AuthActions

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
}
