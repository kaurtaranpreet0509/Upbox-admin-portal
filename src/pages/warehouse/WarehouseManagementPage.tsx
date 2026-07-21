import { useMemo, useState } from 'react'
import { Filter, Network, Search } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { ActionsMenu } from '@/components/warehouse/ActionsMenu'
import { CapacityFilterPanel } from '@/components/warehouse/CapacityFilterPanel'
import { HierarchyPickerModal } from '@/components/warehouse/HierarchyPickerModal'
import { BinrackFormModal } from '@/components/warehouse/BinrackFormModal'
import { BagFormModal } from '@/components/warehouse/BagFormModal'
import {
  BinrackExpandList,
  GoodsInExpandList,
  InspectionExpandList,
  LocationsTrolleyExpandList,
} from '@/components/warehouse/LocationExpandLists'
import { LocationsBrowserPage } from '@/pages/inventory/LocationsBrowserPage'
import { useBinracks, useHierarchy, useInvalidateInbound, useTrolleyBags } from '@/hooks/useInbound'
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

function matchesCapacity(fill: number, rules: CapacityRule[]): boolean {
  const active = rules.filter((r) => r.enabled)
  if (active.length === 0) return true
  return active.every((r) => {
    switch (r.op) {
      case 'eq':
        return fill === r.value
      case 'lt':
        return fill < r.value
      case 'gt':
        return fill > r.value
      case 'lte':
        return fill <= r.value
      case 'gte':
        return fill >= r.value
      default:
        return true
    }
  })
}

type LocationView = 'goods_in' | 'binracks' | 'inspection' | 'trolleys' | 'floor_map'

export function WarehouseManagementPage() {
  const hasRole = useAuthStore((s) => s.hasRole)
  const user = useAuthStore((s) => s.user)
  const isSupervisor = hasRole('WMS_SUPERVISOR') || user?.userType === 'SUPER_ADMIN'
  const invalidate = useInvalidateInbound()

  const [view, setView] = useState<LocationView>('goods_in')
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
  const [selectedBagLabel, setSelectedBagLabel] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [bagFormMode, setBagFormMode] = useState<'create' | 'edit' | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filters = useMemo(
    () => ({ search, zoneTypes, capacityRules, hierarchyIds }),
    [search, zoneTypes, capacityRules, hierarchyIds]
  )

  const binsQ = useBinracks(filters)
  const hierQ = useHierarchy()
  const trolleysQ = useTrolleyBags()

  const selected: BinrackRow | null = binsQ.data?.find((r) => r.id === selectedId) ?? null

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

  const viewRows = useMemo(() => {
    const rows = binsQ.data ?? []
    if (view === 'goods_in') {
      return rows.filter((r) => r.locationKind === 'carton_staging' || r.zoneType === 'goods_in')
    }
    if (view === 'binracks') {
      return rows.filter((r) => r.zoneType === 'pick')
    }
    if (view === 'inspection') {
      return rows.filter((r) => r.zoneType === 'inspection' || r.locationKind === 'inspection_hold')
    }
    return rows
  }, [binsQ.data, view])

  const trolleyBags = useMemo(() => {
    const bags = trolleysQ.data ?? []
    const q = search.trim().toLowerCase()
    return bags.filter((bag) => {
      if (q) {
        const hit =
          bag.label.toLowerCase().includes(q) ||
          bag.cartonIds.some((id) => id.toLowerCase().includes(q)) ||
          bag.products.some(
            (p) =>
              p.sku.toLowerCase().includes(q) ||
              p.barcode.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.cartonId.toLowerCase().includes(q) ||
              p.cartonBarcode.toLowerCase().includes(q)
          )
        if (!hit) return false
      }
      // Occupancy vs mock bag capacity of 20 units (same as list fill %)
      const fillPercent = bag.productCount === 0 ? 0 : Math.min(100, (bag.productCount / 20) * 100)
      if (!matchesCapacity(fillPercent, capacityRules)) return false
      return true
    })
  }, [trolleysQ.data, search, capacityRules])

  const searchPlaceholder =
    view === 'goods_in'
      ? 'Carton or bay…'
      : view === 'trolleys'
        ? 'Bag, trolley, or SKU…'
        : view === 'inspection'
          ? 'Hold or product…'
          : 'SKU or location…'

  const lockedZoneType: ZoneType | undefined =
    view === 'goods_in' ? 'goods_in' : view === 'binracks' ? 'pick' : view === 'inspection' ? 'inspection' : undefined

  const hasSelection =
    view === 'trolleys' ? !!selectedBagLabel : !!selectedId

  return (
    <div>
      <PageHeader title="Locations" />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: 'goods_in' as const, label: 'Goods In' },
            { id: 'binracks' as const, label: 'Binracks' },
            { id: 'inspection' as const, label: 'Inspection' },
            { id: 'trolleys' as const, label: 'Trolley / bag' },
            { id: 'floor_map' as const, label: 'Floor map' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setView(tab.id)
              setSelectedId(null)
              setSelectedBagLabel(null)
              setFormMode(null)
              setBagFormMode(null)
            }}
            className={cn(
              'cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition',
              view === tab.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'floor_map' ? <LocationsBrowserPage embedded /> : null}

      {view !== 'floor_map' ? (
      <div className="surface-card mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(draftSearch)
            }}
            placeholder={searchPlaceholder}
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
              hasSelection={hasSelection}
              canManageBinracks={isSupervisor}
              onNew={() => {
                if (view === 'trolleys') setBagFormMode('create')
                else setFormMode('create')
              }}
              onEdit={() => {
                if (view === 'trolleys') {
                  if (!selectedBagLabel) return
                  setBagFormMode('edit')
                  return
                }
                if (!selectedId) return
                setFormMode('edit')
              }}
              onDelete={async () => {
                if (!isSupervisor) return
                if (view === 'trolleys') {
                  if (!selectedBagLabel) return
                  if (
                    !window.confirm(
                      `Delete bag / trolley ${selectedBagLabel}? This cannot be undone.`
                    )
                  ) {
                    return
                  }
                  try {
                    await warehouseService.deleteBag(selectedBagLabel)
                    setSelectedBagLabel(null)
                    invalidate()
                    showToast(`Deleted ${selectedBagLabel}`)
                  } catch (e) {
                    window.alert(e instanceof Error ? e.message : 'Delete failed')
                  }
                  return
                }
                if (!selectedId) return
                const row = selected
                if (!row) return
                if (
                  !window.confirm(`Delete location ${row.locationCode}? This cannot be undone.`)
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
                if (view === 'trolleys') {
                  if (trolleyBags.length === 0) {
                    window.alert('Nothing to export — no bags match the current filters.')
                    return
                  }
                  downloadCsv(
                    `trolleys-${new Date().toISOString().slice(0, 10)}.csv`,
                    ['Bag', 'Products', 'Cartons', 'SKUs', 'Status'],
                    trolleyBags.map((b) => [
                      b.label,
                      String(b.productCount),
                      String(b.cartonIds.length),
                      b.products.map((p) => p.sku).join('|'),
                      b.productCount === 0 ? 'Empty' : 'In use',
                    ])
                  )
                  showToast(`Exported ${trolleyBags.length} bag(s)`)
                  return
                }
                const rows = viewRows
                if (rows.length === 0) {
                  window.alert('Nothing to export — no locations in the current view.')
                  return
                }
                downloadCsv(
                  `locations-${view}-${new Date().toISOString().slice(0, 10)}.csv`,
                  ['Location', 'Barcode', 'Zone', 'Kind', 'Fill%', 'Contents', 'Groups'],
                  rows.map((r) => [
                    r.locationCode,
                    r.scanBarcode ?? '',
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
      ) : null}

      {toast ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}

      {view !== 'floor_map' && view !== 'trolleys' && binsQ.isLoading ? (
        <LoadingPanel label="Loading locations…" />
      ) : null}
      {view === 'trolleys' && trolleysQ.isLoading ? <LoadingPanel label="Loading trolleys…" /> : null}
      {binsQ.error && view !== 'trolleys' && view !== 'floor_map' ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          {(binsQ.error as Error).message}
        </div>
      ) : null}
      {trolleysQ.error && view === 'trolleys' ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          {(trolleysQ.error as Error).message}
        </div>
      ) : null}

      {view === 'goods_in' && binsQ.data ? (
        <GoodsInExpandList rows={viewRows} selectedId={selectedId} onSelect={setSelectedId} />
      ) : null}
      {view === 'binracks' && binsQ.data ? (
        <BinrackExpandList rows={viewRows} selectedId={selectedId} onSelect={setSelectedId} />
      ) : null}
      {view === 'inspection' && binsQ.data ? (
        <InspectionExpandList rows={viewRows} selectedId={selectedId} onSelect={setSelectedId} />
      ) : null}
      {view === 'trolleys' && trolleysQ.data ? (
        <LocationsTrolleyExpandList
          bags={trolleyBags}
          selectedLabel={selectedBagLabel}
          onSelect={setSelectedBagLabel}
          emptyLabel={
            search || capacityRules.some((r) => r.enabled)
              ? 'No bags match your search or filters.'
              : 'No bags or trolleys yet.'
          }
        />
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
        open={formMode !== null && isSupervisor && view !== 'trolleys' && view !== 'floor_map'}
        mode={formMode === 'edit' ? 'edit' : 'create'}
        initial={formMode === 'edit' ? selected : null}
        lockedZoneType={lockedZoneType}
        onClose={() => setFormMode(null)}
        onSubmit={async (values) => {
          if (!isSupervisor) throw new Error('Only supervisors can manage locations')
          const payload = {
            locationCode: values.locationCode,
            zoneType: lockedZoneType ?? values.zoneType,
            storageGroups: parseGroups(values.storageGroups),
            capacity: { w: values.w, h: values.h, d: values.d },
            maxUnits: values.maxUnits,
            hierarchyPath: values.hierarchyPath,
            scanBarcode: values.scanBarcode || null,
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

      <BagFormModal
        open={bagFormMode !== null && isSupervisor && view === 'trolleys'}
        mode={bagFormMode === 'edit' ? 'edit' : 'create'}
        initialLabel={bagFormMode === 'edit' ? selectedBagLabel : null}
        onClose={() => setBagFormMode(null)}
        onSubmit={async (label) => {
          if (!isSupervisor) throw new Error('Only supervisors can manage bags')
          if (bagFormMode === 'edit' && selectedBagLabel) {
            const next = await warehouseService.renameBag(selectedBagLabel, label)
            setSelectedBagLabel(next)
            showToast(`Updated ${next}`)
          } else {
            const created = await warehouseService.createBag(label)
            setSelectedBagLabel(created)
            showToast(`Created ${created}`)
          }
          invalidate()
        }}
      />
    </div>
  )
}
