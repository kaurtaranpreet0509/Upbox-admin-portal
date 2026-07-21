import { useState } from 'react'
import { BrandTabs } from '@/components/inventory/BrandTabs'
import { ZoneBadge } from '@/components/inventory/Badges'
import { EmptyState, LoadingPanel, PageHeader, StatCard } from '@/components/ui/InventoryPrimitives'
import { useBrands, useInventorySummary, useUtilization } from '@/hooks/useInventory'
import { cn } from '@/lib/cn'

export function RackUtilizationPage() {
  const [brandId, setBrandId] = useState('all')
  const [zoneType, setZoneType] = useState<string>('all')
  const [band, setBand] = useState<'all' | 'empty' | 'mid' | 'near_full' | 'full'>('all')

  const brandsQ = useBrands()
  const summaryQ = useInventorySummary(brandId)
  const utilQ = useUtilization({ brandId, zoneType, band })

  return (
    <div>
      <PageHeader
        title="Rack utilization"
        description="See how full each rack and bay is, which brands own pick slots, and which locations are empty or near capacity."
      />

      {summaryQ.data ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Avg utilization" value={`${summaryQ.data.avgRackUtilization}%`} />
          <StatCard
            label="Near full / full"
            value={summaryQ.data.racksNearFull}
            tone={summaryQ.data.racksNearFull > 0 ? 'warn' : 'default'}
          />
          <StatCard label="Empty locations" value={summaryQ.data.emptyRacks} />
        </div>
      ) : null}

      <div className="surface-card mb-4 space-y-3 p-3">
        {brandsQ.data ? <BrandTabs brands={brandsQ.data} value={brandId} onChange={setBrandId} /> : null}
        <div className="flex flex-wrap gap-2">
          <select
            value={zoneType}
            onChange={(e) => setZoneType(e.target.value)}
            className="surface-input px-3 py-2 text-sm"
          >
            <option value="all">Zone: All</option>
            <option value="pick">Pick</option>
            <option value="goods_in">Goods In</option>
            <option value="inspection">Inspection</option>
          </select>
          <select
            value={band}
            onChange={(e) => setBand(e.target.value as typeof band)}
            className="surface-input px-3 py-2 text-sm"
          >
            <option value="all">Fill: All</option>
            <option value="empty">Empty</option>
            <option value="mid">In use (&lt;70%)</option>
            <option value="near_full">Near full</option>
            <option value="full">Full</option>
          </select>
        </div>
      </div>

      {utilQ.isLoading ? (
        <LoadingPanel label="Loading utilization…" />
      ) : !utilQ.data?.length ? (
        <EmptyState title="No locations match" />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Zone</th>
                <th className="px-3 py-3">Brand</th>
                <th className="px-3 py-3 text-right">Filled / Cap</th>
                <th className="px-3 py-3">Fill</th>
                <th className="px-3 py-3 text-right">SKUs</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {utilQ.data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-3">
                    <p className="font-mono font-bold text-slate-900">{row.locationCode}</p>
                    <p className="text-xs text-slate-500">{row.hierarchyLabel}</p>
                  </td>
                  <td className="px-3 py-3">
                    <ZoneBadge zone={row.zoneType} />
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.brandName ?? '—'}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.filled} / {row.capacity}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[120px] items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            row.fillPercent >= 95
                              ? 'bg-rose-500'
                              : row.fillPercent >= 70
                                ? 'bg-amber-500'
                                : row.fillPercent > 0
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-300'
                          )}
                          style={{ width: `${Math.min(100, row.fillPercent)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold tabular-nums">
                        {row.fillPercent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">{row.skuCount}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-700">
                      {row.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
