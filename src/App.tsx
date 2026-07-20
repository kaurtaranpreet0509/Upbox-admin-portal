import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/layout/AppShell'
import { InboundRoleRouter } from '@/layout/InboundRoleRouter'
import { RequireAuth, RequireInboundRole } from '@/routes/RequireAuth'
import { RequireOnShift } from '@/routes/RequireOnShift'
import { LoginPage } from '@/pages/LoginPage'
import { DockReceivePage } from '@/pages/inbound/DockReceivePage'
import { SortAssignPage } from '@/pages/inbound/SortAssignPage'
import { PutawayPage } from '@/pages/inbound/PutawayPage'
import { DashboardPage } from '@/pages/inbound/DashboardPage'
import { MyWorkPage } from '@/pages/inbound/MyWorkPage'
import { WorkersPage } from '@/pages/inbound/WorkersPage'
import { WorkerDetailPage } from '@/pages/inbound/WorkerDetailPage'
import { TeamWorkPage } from '@/pages/inbound/TeamWorkPage'
import { WarehouseManagementPage } from '@/pages/warehouse/WarehouseManagementPage'
import { MovesManagementPage } from '@/pages/warehouse/MovesManagementPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 2000 },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/inbound" replace />} />
              <Route path="/inbound" element={<InboundRoleRouter />} />

              <Route
                element={
                  <RequireInboundRole roles={['DOCK_RECEIVER', 'SORTER', 'PUTAWAY', 'WMS_SUPERVISOR']} />
                }
              >
                <Route path="/inbound/my-work" element={<MyWorkPage />} />
              </Route>

              <Route element={<RequireInboundRole roles={['WMS_SUPERVISOR']} />}>
                <Route path="/inbound/workers" element={<WorkersPage />} />
                <Route path="/inbound/workers/:workerId" element={<WorkerDetailPage />} />
                <Route path="/inbound/team-work" element={<TeamWorkPage />} />
              </Route>

              <Route element={<RequireOnShift />}>
                <Route element={<RequireInboundRole roles={['DOCK_RECEIVER']} />}>
                  <Route path="/inbound/dock-receive" element={<DockReceivePage />} />
                </Route>
                <Route element={<RequireInboundRole roles={['SORTER']} />}>
                  <Route path="/inbound/sort-assign" element={<SortAssignPage />} />
                </Route>
                <Route element={<RequireInboundRole roles={['PUTAWAY']} />}>
                  <Route path="/inbound/putaway" element={<PutawayPage />} />
                </Route>
                <Route element={<RequireInboundRole roles={['WMS_SUPERVISOR']} />}>
                  <Route path="/inbound/dashboard" element={<DashboardPage />} />
                  <Route path="/warehouse" element={<WarehouseManagementPage />} />
                  <Route path="/warehouse/moves" element={<MovesManagementPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
      <h1 className="font-heading text-xl text-slate-900">Unauthorized</h1>
      <p className="text-sm text-slate-600">Your account does not have access to this warehouse screen.</p>
      <a href="/login" className="cursor-pointer text-sm font-semibold text-primary-700 hover:underline">
        Back to login
      </a>
    </div>
  )
}

export default App
