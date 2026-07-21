import type { LoginCredentials, LoginResponse } from '@/types/auth'
import type { WorkerRole } from '@/types/inbound'
import { workers } from '@/data/mockInbound'

const ACCOUNTS: Record<string, { password: string; workerId: string; name: string; defaultRole: WorkerRole }> =
  {
    'dock@upbox.test': {
      password: 'password123',
      workerId: 'w-dock',
      name: 'Amit Dock',
      defaultRole: 'DOCK_RECEIVER',
    },
    'sort@upbox.test': {
      password: 'password123',
      workerId: 'w-unpack',
      name: 'Bina Unpacker',
      defaultRole: 'UNPACKER',
    },
    'unpack@upbox.test': {
      password: 'password123',
      workerId: 'w-unpack',
      name: 'Bina Unpacker',
      defaultRole: 'UNPACKER',
    },
    'putaway@upbox.test': {
      password: 'password123',
      workerId: 'w-put-1',
      name: 'Ravi Putaway',
      defaultRole: 'PUTAWAY',
    },
    'putaway2@upbox.test': {
      password: 'password123',
      workerId: 'w-put-2',
      name: 'Priya Putaway',
      defaultRole: 'PUTAWAY',
    },
    'supervisor@upbox.test': {
      password: 'password123',
      workerId: 'w-sup',
      name: 'Sara Supervisor',
      defaultRole: 'WMS_SUPERVISOR',
    },
  }

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    await new Promise((r) => setTimeout(r, 400))
    const key = credentials.email.trim().toLowerCase()
    const account = ACCOUNTS[key]
    if (!account || account.password !== credentials.password) {
      const err = new Error('Invalid email or password') as Error & { code: string; statusCode: number }
      err.code = 'INVALID_CREDENTIALS'
      err.statusCode = 401
      throw err
    }
    const worker = workers.find((w) => w.id === account.workerId)
    const role = worker?.role ?? account.defaultRole
    const [firstName, ...rest] = account.name.split(' ')
    return {
      accessToken: `mock-access-${account.workerId}`,
      refreshToken: `mock-refresh-${account.workerId}`,
      idToken: `mock-id-${account.workerId}`,
      expiresIn: 3600,
      sessionId: `sess-${account.workerId}`,
      user: {
        username: key.split('@')[0]!,
        email: key,
        userType: role === 'WMS_SUPERVISOR' ? 'SUPER_ADMIN' : 'TENANT_USER',
        firstName,
        lastName: rest.join(' ') || null,
        tenantId: 'tenant-upbox',
        tenantName: 'Upbox Warehouse',
        roles: [role],
        permissions: [],
        workerId: account.workerId,
      },
    }
  },

  async logout(): Promise<void> {
    await new Promise((r) => setTimeout(r, 100))
  },
}
