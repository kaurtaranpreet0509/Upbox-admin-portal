import { useMemo, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { ActionsMenu } from '@/components/warehouse/ActionsMenu'
import {
  MovesFilterPanel,
  type MovesFilters,
} from '@/components/warehouse/MovesFilterPanel'
import { ZoneTypeBadge } from '@/components/common/Badges'
import { useMoveUsernames, useMoves } from '@/hooks/useInbound'
import { EmptyState } from '@/components/ui/EmptyState'
import { downloadCsv } from '@/lib/downloadCsv'
import { cn } from '@/lib/cn'

const emptyFilters: MovesFilters = {
  states: [],
  fromZones: [],
  toZones: [],
  usernames: [],
}

export function MovesManagementPage() {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [filters, setFilters] = useState<MovesFilters>(emptyFilters)
  const [toast, setToast] = useState<string | null>(null)

  const queryFilters = useMemo(
    () => ({
      search,
      states: filters.states,
      fromZones: filters.fromZones,
      toZones: filters.toZones,
      usernames: filters.usernames,
    }),
    [search, filters]
  )

  const movesQ = useMoves(queryFilters)
  const usersQ = useMoveUsernames()

  const hasActiveFilters =
    filters.states.length > 0 ||
    filters.fromZones.length > 0 ||
    filters.toZones.length > 0 ||
    filters.usernames.length > 0

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    showToast('Cleared filters')
  }

  return (
    <div>
      <PageHeader title="Moves Management" />

      <div className="surface-card mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(draft)
            }}
            placeholder="SKU / Batch / Location / User / State…"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm sm:min-w-[220px]"
          />
          <button
            type="button"
            onClick={() => setSearch(draft)}
            className="cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setActionsOpen(false)
              setFilterOpen((v) => !v)
            }}
            className={cn(
              'cursor-pointer rounded-lg border p-2 hover:bg-slate-50',
              filterOpen || hasActiveFilters
                ? 'border-primary-400 bg-primary-50 text-primary-700'
                : 'border-slate-300 text-slate-600'
            )}
            aria-label="Filters"
          >
            <Filter className="h-4 w-4" />
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear all
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <ActionsMenu
              open={actionsOpen}
              onOpenChange={(open) => {
                setActionsOpen(open)
                if (open) setFilterOpen(false)
              }}
              canManageBinracks={false}
              onExport={() => {
                const rows = movesQ.data ?? []
                if (rows.length === 0) {
                  window.alert('Nothing to export — no moves in the current view.')
                  return
                }
                downloadCsv(
                  `moves-${new Date().toISOString().slice(0, 10)}.csv`,
                  ['Username', 'SKU', 'Batch', 'From', 'FromZone', 'To', 'ToZone', 'Quantity', 'State'],
                  rows.map((m) => [
                    m.username,
                    m.sku,
                    m.batchNo ?? '',
                    m.fromLabel,
                    m.fromZone,
                    m.toLabel ?? '',
                    m.toZone ?? '',
                    String(m.quantity),
                    m.state,
                  ])
                )
                showToast(`Exported ${rows.length} move(s)`)
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

      {movesQ.isLoading ? <LoadingPanel label="Loading moves…" /> : null}
      {movesQ.data && movesQ.data.length === 0 ? (
        <EmptyState
          title={
            search || hasActiveFilters ? 'No moves match your search or filters' : 'No moves found'
          }
        />
      ) : null}

      {movesQ.data && movesQ.data.length > 0 ? (
        <div className="surface-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">SKU / Batch</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movesQ.data.map((m) => (
                  <tr key={m.id} className="hover:bg-indigo-50/40">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.username}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sky-700">{m.sku}</div>
                      <div className="text-xs text-slate-500">{m.batchNo ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <ZoneTypeBadge zone={m.fromZone} />
                        <span className="font-mono text-xs">{m.fromLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.toZone && m.toLabel ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <ZoneTypeBadge zone={m.toZone} />
                          <span className="font-mono text-xs">{m.toLabel}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{m.quantity}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 ring-1 ring-sky-200">
                        {m.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <MovesFilterPanel
        open={filterOpen}
        filters={filters}
        usernameOptions={usersQ.data ?? []}
        onChange={setFilters}
        onClear={clearFilters}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  )
}
