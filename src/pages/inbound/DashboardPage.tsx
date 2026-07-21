import { PageHeader } from '@/layout/PageHeader'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { CapacityFillPill, ZoneTypeBadge } from '@/components/common/Badges'
import { useBinracks, useMoves, useShipments, useWorkers } from '@/hooks/useInbound'
import { workerActivitySummary } from '@/lib/workerActivity'
import { CAPACITY_OPS } from '@/types/inbound'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const shipmentsQ = useShipments()
  const workersQ = useWorkers()
  const binsQ = useBinracks({
    search: '',
    zoneTypes: [],
    capacityRules: CAPACITY_OPS.map(({ op }) => ({ op, value: 0, enabled: false })),
    hierarchyIds: [],
  })
  const movesQ = useMoves({ search: '' })

  const shipment = shipmentsQ.data?.[0]
  const cartons = shipment?.cartons ?? []
  const received = cartons.filter((c) => c.status !== 'PENDING').length
  const allProducts = cartons.flatMap((c) => c.products)
  const staged = allProducts.filter((p) => p.status === 'STAGED').length
  const assigned = allProducts.filter((p) => p.status === 'ASSIGNED').length
  const placed = allProducts.filter((p) => p.status === 'PLACED').length

  return (
    <div>
      <PageHeader
        title="Inbound overview"
        actions={
          <div className="flex gap-2">
            <Link
              to="/inbound/assign-putaway"
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Assign putaway
            </Link>
            <Link
              to="/warehouse"
              className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Locations
            </Link>
            <Link
              to="/warehouse/moves"
              className="cursor-pointer rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Moves management
            </Link>
          </div>
        }
      />

      {(shipmentsQ.isLoading || binsQ.isLoading) && <LoadingPanel label="Loading overview…" />}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cartons received"
          value={`${received} / ${cartons.length}`}
          sub={shipment?.poNumber}
        />
        <StatCard label="Products staged" value={`${staged}`} sub="Awaiting assign" />
        <StatCard label="Assigned to putaway" value={`${assigned}`} sub="On floor queues" />
        <StatCard
          label="Products placed"
          value={`${placed} / ${allProducts.length}`}
          sub={`${Math.round((placed / Math.max(1, allProducts.length)) * 100)}%`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-panel overflow-hidden">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Worker activity
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Worker</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Work done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(workersQ.data ?? []).map((w) => {
                const activity = workerActivitySummary(w, 'today')
                return (
                  <tr key={w.id}>
                    <td className="px-4 py-2 font-medium">{w.name}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{w.role}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium text-slate-800">{activity.label}</span>
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {activity.qty}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">today</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section className="surface-panel overflow-hidden">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
            Open moves ({movesQ.data?.filter((m) => m.state === 'Open').length ?? 0})
          </h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {(movesQ.data ?? []).slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <span>
                  <strong>{m.sku}</strong> · {m.username}
                </span>
                <span className="text-xs text-slate-500">qty {m.quantity}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="surface-panel p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Location utilization</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(binsQ.data ?? []).map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
              style={{
                borderColor:
                  b.fillPercent > 50 ? '#fca5a5' : b.fillPercent > 10 ? '#fcd34d' : '#86efac',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <ZoneTypeBadge zone={b.zoneType} />
                <span className="font-mono text-xs font-semibold">{b.locationCode}</span>
              </div>
              <CapacityFillPill percent={b.fillPercent} />
              <p className="mt-2 text-xs text-slate-500">
                {b.skuCount} SKUs x {b.itemQty}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{props.label}</p>
      <p className="mt-1 font-heading text-2xl text-slate-900">{props.value}</p>
      {props.sub ? <p className="mt-1 text-xs text-slate-500">{props.sub}</p> : null}
    </div>
  )
}
