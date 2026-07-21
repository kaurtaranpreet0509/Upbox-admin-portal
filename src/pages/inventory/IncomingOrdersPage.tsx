import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { BrandTabs } from '@/components/inventory/BrandTabs'
import { OrderStatusBadge } from '@/components/inventory/Badges'
import { EmptyState, LoadingPanel, PageHeader, StatCard } from '@/components/ui/InventoryPrimitives'
import { useBrands, useIncomingOrders } from '@/hooks/useInventory'
import { cn } from '@/lib/cn'

export function IncomingOrdersPage() {
  const [brandId, setBrandId] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const brandsQ = useBrands()
  const ordersQ = useIncomingOrders(brandId)

  const orders = ordersQ.data ?? []
  const unitsExpected = orders.reduce((s, o) => s + o.unitsExpected, 0)
  const unitsPending = orders.reduce((s, o) => s + o.unitsPending, 0)
  const atDock = orders.filter((o) => o.status === 'at_dock' || o.status === 'receiving').length

  return (
    <div>
      <PageHeader
        title="Incoming"
        description="Expected FBU / purchase orders into the warehouse — separate from dock receive scanning. Units pending are not yet put away."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Open orders" value={orders.length} />
        <StatCard label="Units expected" value={unitsExpected} />
        <StatCard label="Still pending" value={unitsPending} tone={unitsPending > 0 ? 'warn' : 'default'} sub={`${atDock} at dock`} />
      </div>

      <div className="surface-card mb-4 p-3">
        {brandsQ.data ? <BrandTabs brands={brandsQ.data} value={brandId} onChange={setBrandId} /> : null}
      </div>

      {ordersQ.isLoading ? (
        <LoadingPanel label="Loading incoming…" />
      ) : !orders.length ? (
        <EmptyState title="No incoming orders" description="Nothing expected for this brand filter." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const open = openId === order.id
            return (
              <section key={order.id} className="surface-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : order.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
                >
                  {open ? (
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-base text-slate-900">{order.poNumber}</p>
                      <OrderStatusBadge status={order.status} />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {order.source === 'seller_fbu' ? 'Seller FBU' : 'Purchase order'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{order.sellerName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Expected {order.expectedAt} · {order.cartonCount} cartons · Brands:{' '}
                      {order.brandNames.join(', ')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="font-semibold text-slate-900">
                      {order.unitsReceived}/{order.unitsExpected}
                    </p>
                    <p className="text-xs text-slate-500">{order.unitsPending} pending</p>
                  </div>
                </button>

                <div className={cn('border-t border-slate-100', open ? 'block' : 'hidden')}>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Brand</th>
                        <th className="px-4 py-2 text-right">Expected</th>
                        <th className="px-4 py-2 text-right">Received</th>
                        <th className="px-4 py-2 text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.lines.map((line) => (
                        <tr key={`${order.id}-${line.sku}`}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-slate-900">{line.name}</p>
                            <p className="font-mono text-xs text-slate-500">{line.sku}</p>
                          </td>
                          <td className="px-4 py-2 text-slate-700">{line.brandName}</td>
                          <td className="px-4 py-2 text-right">{line.qtyExpected}</td>
                          <td className="px-4 py-2 text-right text-emerald-700">{line.qtyReceived}</td>
                          <td className="px-4 py-2 text-right text-amber-700">{line.qtyPending}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
