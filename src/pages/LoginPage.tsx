import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/useAuthStore'
import { roleHomePath } from '@/routes/roleRoutes'
import type { ApiError } from '@/types/auth'

const DEMO_ACCOUNTS = [
  { email: 'dock@upbox.test', role: 'Dock Receiver (A)' },
  { email: 'sort@upbox.test', role: 'Sorter (B)' },
  { email: 'putaway@upbox.test', role: 'Putaway (C)' },
  { email: 'supervisor@upbox.test', role: 'Supervisor' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuthStore()
  const [email, setEmail] = useState('supervisor@upbox.test')
  const [password, setPassword] = useState('password123')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(roleHomePath(user.roles ?? []), { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await authService.login({ email, password })
      login(response)
      navigate(roleHomePath(response.user.roles ?? []), { replace: true })
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600">Upbox WMS</p>
        <h1 className="font-heading mt-2 text-2xl text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Warehouse inbound admin portal</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm"
                placeholder="you@upbox.test"
              />
            </div>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Password</span>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm"
              />
              <button
                type="button"
                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full rounded-lg bg-primary-600 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Demo accounts</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="cursor-pointer text-left hover:text-primary-700"
                  onClick={() => {
                    setEmail(a.email)
                    setPassword('password123')
                  }}
                >
                  <span className="font-mono font-semibold">{a.email}</span> — {a.role}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">Password for all: password123</p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          <Link to="/" className="cursor-pointer hover:text-slate-600">
            Upbox Admin
          </Link>
        </p>
      </div>
    </div>
  )
}
