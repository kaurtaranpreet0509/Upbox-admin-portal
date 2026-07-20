import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/auth.service'
import type { AuthStore, LoginResponse } from '@/types/auth'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      sessionId: null,
      isAuthenticated: false,
      isLoading: false,

      login: (response: LoginResponse) => {
        set({
          user: response.user,
          tokens: {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            idToken: response.idToken,
            expiresIn: response.expiresIn,
            expiresAt: Date.now() + response.expiresIn * 1000,
          },
          sessionId: response.sessionId,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      logout: async () => {
        try {
          await authService.logout()
        } finally {
          set({
            user: null,
            tokens: null,
            sessionId: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      hasRole: (role: string) => {
        const user = get().user
        if (user?.userType === 'SUPER_ADMIN') return true
        return user?.roles?.includes(role) ?? false
      },

      hasAnyRole: (roles: string[]) => {
        const user = get().user
        if (user?.userType === 'SUPER_ADMIN') return true
        if (!user?.roles) return false
        return roles.some((r) => user.roles!.includes(r))
      },

      setUserRoles: (roles: string[]) => {
        const user = get().user
        if (!user) return
        set({
          user: {
            ...user,
            roles,
            userType: roles.includes('WMS_SUPERVISOR') ? 'SUPER_ADMIN' : 'TENANT_USER',
          },
        })
      },
    }),
    {
      name: 'upbox-wms-auth',
      partialize: (state) => ({
        user: state.user,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
        tokens: state.tokens,
      }),
    }
  )
)
