import { useMemo, useState } from 'react'
import { Filter, Network, Search } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { ActionsMenu } from '@/components/warehouse/ActionsMenu'
import { CapacityFilterPanel } from '@/components/warehouse/CapacityFilterPanel'
import { HierarchyPickerModal } from '@/components/warehouse/HierarchyPickerModal'
import { BinrackTable } from '@/components/warehouse/BinrackTable'
import { BinrackFormModal } from '@/components/warehouse/BinrackFormModal'
import { useBinracks, useHierarchy, useInvalidateInbound } from '@/hooks/useInbound'
import { warehouseService } from '@/services/inbound.service'
import { useAuthStore } from '@/store/useAuthStore'
import type { BinrackRow, CapacityRule, ZoneType } from '@/types/inbound'
import { CAPACITY_OPS } from '@/types/inbound'
import { downloadCsv } from '@/lib/downloadCsv'
import { cn } from '@/lib/cn'

const defaultRules: CapacityRule[] = CAPACITY_OPS.map(({ op }) => ({
  op,
  value: 0,
  enabled: false,
}))

export function WarehouseManagementPage() {
  const hasRole = useAuthStore((s) => s.hasRole)
  const user = useAuthStore((s) => s.user)
  const isSupervisor = hasRole('WMS_SUPERVISOR') || user?.userType === 'SUPER_ADMIN'
  const invalidate = useInvalidateInbound()

  const [search, setSearch] = useState('')
  const [draftSearch, setDraftSearch] = useState('')
  const [openPanel, setOpenPanel] = useState<'filter' | 'hierarchy' | 'actions' | null>(null)
  const filterOpen = openPanel === 'filter'
  const hierarchyOpen = openPanel === 'hierarchy'
  const actionsOpen = openPanel === 'actions'
  const [zoneTypes, setZoneTypes] = useState<ZoneType[]>([])
  const [capacityRules, setCapacityRules] = useState<CapacityRule[]>(defaultRules)
  const [hierarchyIds, setHierarchyIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filters = useMemo(
    () => ({ search, zoneTypes, capacityRules, hierarchyIds }),
    [search, zoneTypes, capacityRules, hierarchyIds]
  )

  const binsQ = useBinracks(filters)
  const hierQ = useHierarchy()

  const selected: BinrackRow | null =
    binsQ.data?.find((r) => r.id === selectedId) ?? null

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const parseGroups = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const hasActiveFilters =
    zoneTypes.length > 0 ||
    capacityRules.some((r) => r.enabled) ||
    hierarchyIds.length > 0

  const clearFilters = () => {
    setZoneTypes([])
    setCapacityRules(defaultRules)
  }

  const clearAll = () => {
    clearFilters()
    setHierarchyIds([])
    setOpenPanel(null)
    showToast('Cleared filters and hierarchy')
  }

  return (
    <div>
      <PageHeader title="Locations" />

      <div className="surface-card mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(draftSearch)
            }}
            placeholder="SKU or Bin Rack"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm sm:min-w-[200px]"
          />
          <button
            type="button"
            onClick={() => setSearch(draftSearch)}
            className="cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpenPanel((v) => (v === 'filter' ? null : 'filter'))}
            className={cn(
              'cursor-pointer rounded-lg border p-2 hover:bg-slate-50',
              filterOpen || zoneTypes.length > 0 || capacityRules.some((r) => r.enabled)
                ? 'border-primary-400 bg-primary-50 text-primary-700'
                : 'border-slate-300 text-slate-600'
            )}
            aria-label="Filters"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpenPanel((v) => (v === 'hierarchy' ? null : 'hierarchy'))}
            className={cn(
              'cursor-pointer rounded-lg border p-2 hover:bg-slate-50',
              hierarchyOpen || hierarchyIds.length > 0
                ? 'border-primary-400 bg-primary-50 text-primary-700'
                : 'border-slate-300 text-slate-600'
            )}
            aria-label="Hierarchy"
          >
            <Network className="h-4 w-4" />
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear all
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <ActionsMenu
              open={actionsOpen}
              onOpenChange={(open) => setOpenPanel(open ? 'actions' : null)}
              hasSelection={!!selectedId}
              canManageBinracks={isSupervisor}
              onNew={() => setFormMode('create')}
              onEdit={() => {
                if (!selectedId) return
                setFormMode('edit')
              }}
              onDelete={async () => {
                if (!selectedId || !isSupervisor) return
                const row = selected
                if (!row) return
                if (
                  !window.confirm(
                    `Delete location ${row.locationCode}? This cannot be undone.`
                  )
                ) {
                  return
                }
                try {
                  await warehouseService.deleteBinrack(selectedId)
                  setSelectedId(null)
                  invalidate()
                  showToast(`Deleted ${row.locationCode}`)
                } catch (e) {
                  window.alert(e instanceof Error ? e.message : 'Delete failed')
                }
              }}
              onExport={() => {
                const rows = binsQ.data ?? []
                if (rows.length === 0) {
                  window.alert('Nothing to export — no locations in the current view.')
                  return
                }
                downloadCsv(
                  `locations-${new Date().toISOString().slice(0, 10)}.csv`,
                  ['Location', 'Zone', 'Kind', 'Fill%', 'Contents', 'Groups'],
                  rows.map((r) => [
                    r.locationCode,
                    r.zoneType,
                    r.locationKind,
                    String(r.fillPercent),
                    r.locationKind === 'carton_staging'
                      ? `${r.stagedCartons.length} cartons`
                      : `${r.skuCount} SKUs x ${r.itemQty}`,
                    r.storageGroups.join('|'),
                  ])
                )
                showToast(`Exported ${rows.length} location(s)`)
              }}
            />
          </div>
        </div>
      </div>

      {toast ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}

      <p className="mb-3 text-xs text-slate-500">
        Zone badges: <span className="font-semibold text-amber-700">Goods In</span> = dock floor /
        pallet bay for whole cartons · <span className="font-semibold text-emerald-700">Pick</span> =
        product shelves · <span className="font-semibold text-violet-700">Inspection</span> = QA /
        hold.
      </p>

      {binsQ.isLoading ? <LoadingPanel label="Loading locations…" /> : null}
      {binsQ.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          {(binsQ.error as Error).message}
        </div>
      ) : null}
      {binsQ.data ? (
        <BinrackTable rows={binsQ.data} selectedId={selectedId} onSelect={setSelectedId} />
      ) : null}

      <CapacityFilterPanel
        open={filterOpen}
        rules={capacityRules}
        zoneTypes={zoneTypes}
        onChangeRules={setCapacityRules}
        onChangeZones={setZoneTypes}
        onClear={() => {
          clearFilters()
          showToast('Cleared filters')
        }}
        onClose={() => setOpenPanel(null)}
      />

      <HierarchyPickerModal
        open={hierarchyOpen}
        nodes={hierQ.data ?? []}
        selectedIds={hierarchyIds}
        onApply={(ids) => {
          setHierarchyIds(ids)
        }}
        onClose={() => setOpenPanel(null)}
      />

      <BinrackFormModal
        open={formMode !== null && isSupervisor}
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        onClose={() => setFormMode(null)}
        onSubmit={async (values) => {
          if (!isSupervisor) throw new Error('Only supervisors can manage locations')
          const payload = {
            locationCode: values.locationCode,
            zoneType: values.zoneType,
            storageGroups: parseGroups(values.storageGroups),
            capacity: { w: values.w, h: values.h, d: values.d },
            maxUnits: values.maxUnits,
            hierarchyPath: values.hierarchyPath,
          }
          if (formMode === 'edit' && selectedId) {
            await warehouseService.updateBinrack(selectedId, payload)
            showToast(`Updated ${payload.locationCode}`)
          } else {
            const created = await warehouseService.createBinrack(payload)
            setSelectedId(created.id)
            showToast(`Created ${created.locationCode}`)
          }
          invalidate()
        }}
      />
    </div>
  )
}
