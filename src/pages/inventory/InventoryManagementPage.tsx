import { useMemo, useState } from 'react'
import { Bell, Search } from 'lucide-react'
import { BrandTabs } from '@/components/inventory/BrandTabs'
import { HealthBadge, SourceBadge } from '@/components/inventory/Badges'
import { NotifySellerModal } from '@/components/inventory/NotifySellerModal'
import { SkuDetailPanel } from '@/components/inventory/SkuDetailPanel'
import { EmptyState, LoadingPanel, PageHeader, StatCard } from '@/components/ui/InventoryPrimitives'
import { useBrands, useInventorySkus, useInventorySummary } from '@/hooks/useInventory'
import { useRestockStore } from '@/store/useRestockStore'
import type { SkuInventoryRow, StockHealth } from '@/types/inventory'
import { needsSellerUpdate } from '@/types/inventory'
import { cn } from '@/lib/cn'

export function InventoryManagementPage() {
  const [brandId, setBrandId] = useState<string>('all')
  const [draftSearch, setDraftSearch] = useState('')
  const [search, setSearch] = useState('')
  const [health, setHealth] = useState<StockHealth | 'all'>('all')
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const [notifySku, setNotifySku] = useState<SkuInventoryRow | null>(null)

  const brandsQ = useBrands()
  const summaryQ = useInventorySummary(brandId)
  const skusQ = useInventorySkus({ brandId, search, health })
  const requests = useRestockStore((s) => s.requests)
  const hasPending = useRestockStore((s) => s.hasPendingRequest)

  const selected = useMemo(
    () => skusQ.data?.find((r) => r.sku === selectedSku) ?? null,
    [skusQ.data, selectedSku]
  )

  const openNotify = (row: SkuInventoryRow, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setNotifySku(row)
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Browse onboarded brands and SKUs from the seller portal and warehouse putaway. Track on-hand, low stock, incoming, and exact rack / bay locations. For low or critical stock, notify the seller to update inventory."
      />

      {brandsQ.isLoading || summaryQ.isLoading ? <LoadingPanel label="Loading inventory…" /> : null}

      {summaryQ.data ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard label="Brands" value={summaryQ.data.brandCount} />
          <StatCard label="SKUs" value={summaryQ.data.skuCount} />
          <StatCard label="Units on hand" value={summaryQ.data.unitsOnHand} tone="ok" />
          <StatCard label="Incoming" value={summaryQ.data.unitsIncoming} />
          <StatCard
            label="Low / critical"
            value={summaryQ.data.lowStockCount}
            tone={summaryQ.data.lowStockCount > 0 ? 'warn' : 'default'}
          />
          <StatCard
            label="Seller notified"
            value={requests.length}
            sub="restock requests sent"
          />
        </div>
      ) : null}

      <div className="surface-card mb-4 space-y-3 p-3">
        {brandsQ.data ? (
          <BrandTabs brands={brandsQ.data} value={brandId} onChange={setBrandId} />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
            <input
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSearch(draftSearch)
              }}
              placeholder="Search SKU, name, barcode, ASIN…"
              className="surface-input w-full py-2 pl-3 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setSearch(draftSearch)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          <select
            value={health}
            onChange={(e) => setHealth(e.target.value as StockHealth | 'all')}
            className="surface-input px-3 py-2 text-sm"
          >
            <option value="all">Stock: All</option>
            <option value="healthy">Healthy</option>
            <option value="low">Low</option>
            <option value="critical">Critical</option>
            <option value="out">Out of stock</option>
            <option value="incoming_only">Incoming only</option>
          </select>
          <button
            type="button"
            onClick={() => setHealth(health === 'low' ? 'critical' : 'low')}
            className={cn(
              'rounded-xl border px-3 py-2 text-xs font-bold transition',
              health === 'low' || health === 'critical'
                ? 'border-amber-400 bg-amber-50 text-amber-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            )}
            title="Filter to SKUs that need a seller inventory update"
          >
            Needs seller update
          </button>
          <span className="text-xs text-slate-500">{skusQ.data?.length ?? 0} results</span>
        </div>
        {(health === 'low' || health === 'critical') && (
          <p className="text-xs text-amber-800">
            Showing {health} stock — use <strong>Notify seller</strong> to ask them to replenish.
            Switch the stock filter between Low and Critical, or set All to clear.
          </p>
        )}
      </div>

      <div className={cn('flex flex-col gap-4', selected ? 'lg:flex-row' : '')}>
        <div className="surface-card min-w-0 flex-1 overflow-x-auto">
          {skusQ.isLoading ? (
            <LoadingPanel label="Loading SKUs…" />
          ) : !skusQ.data?.length ? (
            <div className="p-4">
              <EmptyState title="No SKUs match these filters" description="Try another brand or clear search." />
            </div>
          ) : (
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Brand</th>
                  <th className="px-3 py-3 text-right">On hand</th>
                  <th className="px-3 py-3 text-right">Available</th>
                  <th className="px-3 py-3 text-right">Incoming</th>
                  <th className="px-3 py-3">Primary location</th>
                  <th className="px-3 py-3">Source</th>
                  <th className="px-3 py-3">Health</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {skusQ.data.map((row) => {
                  const canNotify = needsSellerUpdate(row.health)
                  const requested = hasPending(row.sku)
                  return (
                    <tr
                      key={row.catalogId}
                      onClick={() => setSelectedSku(row.sku)}
                      className={cn(
                        'cursor-pointer transition hover:bg-primary-50/40',
                        selectedSku === row.sku && 'bg-primary-50/70'
                      )}
                    >
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">{row.name}</p>
                        <p className="font-mono text-xs text-slate-500">
                          {row.sku} · {row.barcode}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{row.brandName}</td>
                      <td className="px-3 py-3 text-right font-semibold">{row.onHand}</td>
                      <td className="px-3 py-3 text-right">{row.available}</td>
                      <td className="px-3 py-3 text-right text-sky-700">{row.incoming || '—'}</td>
                      <td className="px-3 py-3">
                        {row.primaryLocation ? (
                          <span className="font-mono text-xs font-semibold">{row.primaryLocation}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Not located</span>
                        )}
                        {row.locationCount > 1 ? (
                          <span className="ml-1 text-[10px] text-slate-400">+{row.locationCount - 1}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <SourceBadge source={row.source} />
                      </td>
                      <td className="px-3 py-3">
                        <HealthBadge health={row.health} />
                      </td>
                      <td className="px-3 py-3">
                        {canNotify ? (
                          <button
                            type="button"
                            disabled={requested}
                            onClick={(e) => openNotify(row, e)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold',
                              requested
                                ? 'cursor-not-allowed bg-slate-100 text-slate-500'
                                : 'bg-amber-600 text-white hover:bg-amber-700'
                            )}
                          >
                            <Bell className="h-3.5 w-3.5" />
                            {requested ? 'Requested' : 'Notify seller'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {selected ? (
          <SkuDetailPanel
            sku={selected}
            onClose={() => setSelectedSku(null)}
            onNotifySeller={(row) => setNotifySku(row)}
          />
        ) : null}
      </div>

      {notifySku ? <NotifySellerModal sku={notifySku} onClose={() => setNotifySku(null)} /> : null}
    </div>
  )
}
