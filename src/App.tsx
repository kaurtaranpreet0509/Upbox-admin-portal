import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/layout/AppShell'
import { InboundRoleRouter } from '@/layout/InboundRoleRouter'
import { RequireAuth, RequireInboundRole } from '@/routes/RequireAuth'
import { LoginPage } from '@/pages/LoginPage'
import { DockReceivePage } from '@/pages/inbound/DockReceivePage'
import { UnpackPage } from '@/pages/inbound/UnpackPage'
import { AssignPutawayPage } from '@/pages/inbound/AssignPutawayPage'
import { PutawayPage } from '@/pages/inbound/PutawayPage'
import { DashboardPage } from '@/pages/inbound/DashboardPage'
import { MyWorkPage } from '@/pages/inbound/MyWorkPage'
import { WorkersPage } from '@/pages/inbound/WorkersPage'
import { WorkerDetailPage } from '@/pages/inbound/WorkerDetailPage'
import { TeamWorkPage } from '@/pages/inbound/TeamWorkPage'
import { WarehouseManagementPage } from '@/pages/warehouse/WarehouseManagementPage'
import { MovesManagementPage } from '@/pages/warehouse/MovesManagementPage'
import { InventoryManagementPage } from '@/pages/inventory/InventoryManagementPage'
import { RackUtilizationPage } from '@/pages/inventory/RackUtilizationPage'
import { IncomingOrdersPage } from '@/pages/inventory/IncomingOrdersPage'

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
                  <RequireInboundRole
                    roles={['DOCK_RECEIVER', 'UNPACKER', 'PUTAWAY', 'WMS_SUPERVISOR']}
                  />
                }
              >
                <Route path="/inbound/my-work" element={<MyWorkPage />} />
              </Route>

              <Route element={<RequireInboundRole roles={['WMS_SUPERVISOR']} />}>
                <Route path="/inbound/workers" element={<WorkersPage />} />
                <Route path="/inbound/workers/:workerId" element={<WorkerDetailPage />} />
                <Route path="/inbound/team-work" element={<TeamWorkPage />} />
                <Route path="/inbound/assign-putaway" element={<AssignPutawayPage />} />
                <Route path="/inbound/dashboard" element={<DashboardPage />} />
                <Route path="/warehouse" element={<WarehouseManagementPage />} />
                <Route path="/warehouse/moves" element={<MovesManagementPage />} />
                <Route path="/inventory" element={<InventoryManagementPage />} />
                <Route path="/inventory/utilization" element={<RackUtilizationPage />} />
                <Route path="/inventory/incoming" element={<IncomingOrdersPage />} />
              </Route>

              <Route element={<RequireInboundRole roles={['DOCK_RECEIVER', 'WMS_SUPERVISOR']} />}>
                <Route path="/inbound/dock-receive" element={<DockReceivePage />} />
              </Route>
              <Route element={<RequireInboundRole roles={['UNPACKER', 'WMS_SUPERVISOR']} />}>
                <Route path="/inbound/unpack" element={<UnpackPage />} />
              </Route>
              <Route element={<RequireInboundRole roles={['PUTAWAY', 'WMS_SUPERVISOR']} />}>
                <Route path="/inbound/putaway" element={<PutawayPage />} />
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
