import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Clock3, ListOrdered, Search, X } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { useWorkers } from '@/hooks/useInbound'
import { formatWorkTime } from '@/lib/workerActivity'
import { roleJobLabel } from '@/lib/shifts'
import type { WarehouseWorker, WorkEventKind, WorkerRole } from '@/types/inbound'
import { cn } from '@/lib/cn'

type WorkLane = 'dock' | 'sort' | 'putaway' | 'supervisor' | 'other'
type SortMode = 'time_desc' | 'time_asc' | 'work'

type TeamEvent = {
  id: string
  at: string
  workerId: string
  workerName: string
  role: WorkerRole
  kind: WorkEventKind
  detail?: string
  lane: WorkLane
  day: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function laneForEvent(kind: WorkEventKind, role: WorkerRole): WorkLane {
  if (kind === 'carton_received') return 'dock'
  if (kind === 'carton_assigned') return 'sort'
  if (kind === 'product_placed' || kind === 'carton_completed') return 'putaway'
  if (role === 'WMS_SUPERVISOR') return 'supervisor'
  if (role === 'DOCK_RECEIVER') return 'dock'
  if (role === 'SORTER') return 'sort'
  if (role === 'PUTAWAY') return 'putaway'
  return 'other'
}

function laneLabel(lane: WorkLane): string {
  switch (lane) {
    case 'dock':
      return 'Dock'
    case 'sort':
      return 'Sort'
    case 'putaway':
      return 'Putaway'
    case 'supervisor':
      return 'Supervisor'
    default:
      return 'Other'
  }
}

function laneOrder(lane: WorkLane): number {
  const order: WorkLane[] = ['dock', 'sort', 'putaway', 'supervisor', 'other']
  return order.indexOf(lane)
}

function roleForLane(lane: WorkLane): WorkerRole | null {
  switch (lane) {
    case 'dock':
      return 'DOCK_RECEIVER'
    case 'sort':
      return 'SORTER'
    case 'putaway':
      return 'PUTAWAY'
    case 'supervisor':
      return 'WMS_SUPERVISOR'
    default:
      return null
  }
}

function actionLabel(kind: WorkEventKind): string {
  return kind.replaceAll('_', ' ')
}

function collectEvents(workers: WarehouseWorker[]): TeamEvent[] {
  const rows: TeamEvent[] = []
  for (const w of workers) {
    for (const e of w.activity) {
      rows.push({
        id: `${w.id}-${e.id}`,
        at: e.at,
        workerId: w.id,
        workerName: w.name,
        role: w.role,
        kind: e.kind,
        detail: e.detail,
        lane: laneForEvent(e.kind, w.role),
        day: e.at.slice(0, 10),
      })
    }
  }
  return rows
}

export function TeamWorkPage() {
  const workersQ = useWorkers()
  const [sortMode, setSortMode] = useState<SortMode>('time_desc')
  const [workFilter, setWorkFilter] = useState<WorkLane | 'all'>('all')
  const [nameFilter, setNameFilter] = useState<string>('all')
  const [nameQuery, setNameQuery] = useState('')
  const [dayFilter, setDayFilter] = useState<string>(todayIso())

  const workers = workersQ.data ?? []
  const allEvents = useMemo(() => collectEvents(workers), [workers])

  /** Workers available for the Name combobox (scoped by work type). */
  const workersForWork = useMemo(() => {
    let list = workers
    if (workFilter !== 'all') {
      const role = roleForLane(workFilter)
      list = role ? workers.filter((w) => w.role === role) : []
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [workers, workFilter])

  const nameOptions = useMemo(() => {
    const q = nameQuery.trim().toLowerCase()
    if (!q) return workersForWork
    return workersForWork.filter((w) => w.name.toLowerCase().includes(q))
  }, [workersForWork, nameQuery])

  // If work changes and the selected name is no longer valid, clear it
  useEffect(() => {
    if (nameFilter === 'all') return
    if (!workersForWork.some((w) => w.id === nameFilter)) {
      setNameFilter('all')
      setNameQuery('')
    }
  }, [workersForWork, nameFilter])

  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase()
    const base = allEvents.filter((e) => {
      if (dayFilter && e.day !== dayFilter) return false
      if (workFilter !== 'all' && e.lane !== workFilter) return false
      if (nameFilter !== 'all') {
        if (e.workerId !== nameFilter) return false
      } else if (q && !e.workerName.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
    const sorted = [...base]
    sorted.sort((a, b) => {
      if (sortMode === 'time_desc') return b.at.localeCompare(a.at)
      if (sortMode === 'time_asc') return a.at.localeCompare(b.at)
      const byLane = laneOrder(a.lane) - laneOrder(b.lane)
      if (byLane !== 0) return byLane
      return b.at.localeCompare(a.at)
    })
    return sorted
  }, [allEvents, sortMode, workFilter, nameFilter, nameQuery, dayFilter])

  const totals = useMemo(() => {
    const byLane: Record<WorkLane, number> = {
      dock: 0,
      sort: 0,
      putaway: 0,
      supervisor: 0,
      other: 0,
    }
    const byWorker = new Map<string, { name: string; count: number }>()
    for (const e of filtered) {
      byLane[e.lane] += 1
      const cur = byWorker.get(e.workerId) ?? { name: e.workerName, count: 0 }
      cur.count += 1
      byWorker.set(e.workerId, cur)
    }
    return { byLane, byWorker: [...byWorker.values()].sort((a, b) => b.count - a.count) }
  }, [filtered])

  const [showPersonTotals, setShowPersonTotals] = useState(false)

  const clearFilters = () => {
    setWorkFilter('all')
    setNameFilter('all')
    setNameQuery('')
    setDayFilter(todayIso())
  }

  const onWorkChange = (value: WorkLane | 'all') => {
    setWorkFilter(value)
    setNameFilter('all')
    setNameQuery('')
  }

  return (
    <div>
      <PageHeader title="Team work" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dock</p>
          <p className="mt-1 font-heading text-3xl text-slate-900">{totals.byLane.dock}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sort</p>
          <p className="mt-1 font-heading text-3xl text-slate-900">{totals.byLane.sort}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Putaway</p>
          <p className="mt-1 font-heading text-3xl text-slate-900">{totals.byLane.putaway}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 font-heading text-3xl text-slate-900">{filtered.length}</p>
        </div>
      </div>

      <div className="surface-card mb-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800">Filters</h2>
          <button
            type="button"
            onClick={clearFilters}
            className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Reset
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block cursor-pointer text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Work
            </span>
            <select
              value={workFilter}
              onChange={(e) => onWorkChange(e.target.value as WorkLane | 'all')}
              className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="all">All</option>
              <option value="dock">Dock</option>
              <option value="sort">Sort</option>
              <option value="putaway">Putaway</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </label>

          <div className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
              {workFilter !== 'all' ? (
                <span className="ml-1 font-normal normal-case text-slate-400">
                  ({laneLabel(workFilter)} only)
                </span>
              ) : null}
            </span>
            <WorkerNameCombobox
              query={nameQuery}
              onQueryChange={(q) => {
                setNameQuery(q)
                setNameFilter('all')
              }}
              selectedId={nameFilter}
              options={nameOptions}
              allLabel={
                workFilter === 'all'
                  ? 'All workers'
                  : `All ${laneLabel(workFilter).toLowerCase()} workers`
              }
              onSelectAll={() => {
                setNameFilter('all')
                setNameQuery('')
              }}
              onSelectWorker={(w) => {
                setNameFilter(w.id)
                setNameQuery(w.name)
              }}
              emptyHint={
                workFilter !== 'all'
                  ? `No ${laneLabel(workFilter).toLowerCase()} workers match`
                  : 'No workers match'
              }
            />
          </div>

          <label className="block cursor-pointer text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Day
            </span>
            <input
              type="date"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            />
          </label>
        </div>
      </div>

      <div className="surface-card mb-4 flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort</span>
        <SortChip
          active={sortMode === 'time_desc'}
          icon={Clock3}
          label="Newest"
          onClick={() => setSortMode('time_desc')}
        />
        <SortChip
          active={sortMode === 'time_asc'}
          icon={Clock3}
          label="Oldest"
          onClick={() => setSortMode('time_asc')}
        />
        <SortChip
          active={sortMode === 'work'}
          icon={ListOrdered}
          label="By work"
          onClick={() => setSortMode('work')}
        />
      </div>

      {workersQ.isLoading ? <LoadingPanel label="Loading team work…" /> : null}

      {workersQ.data ? (
        <div className="space-y-4">
          <section className="surface-panel overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPersonTotals((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              <span>Totals by person</span>
              <span className="text-xs font-semibold text-slate-500">
                {showPersonTotals ? 'Hide' : 'Show'}
              </span>
            </button>
            {showPersonTotals ? (
              totals.byWorker.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">No work recorded for these filters.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {totals.byWorker.map((w) => (
                    <li
                      key={w.name}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-slate-900">{w.name}</span>
                      <span className="shrink-0 text-xs font-bold text-slate-600">
                        {w.count} actions
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>

          <section className="surface-panel overflow-hidden">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
              Activity ({filtered.length})
            </h2>
            {filtered.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No matching work for these filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Work</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((e) => (
                      <tr key={e.id} className="hover:bg-indigo-50/40">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                          {formatWorkTime(e.at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{e.workerName}</div>
                          <div className="text-[11px] text-slate-500">{roleJobLabel(e.role)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-lg px-2 py-1 text-xs font-bold',
                              e.lane === 'dock' && 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
                              e.lane === 'sort' && 'bg-sky-50 text-sky-900 ring-1 ring-sky-200',
                              e.lane === 'putaway' &&
                                'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
                              e.lane === 'supervisor' &&
                                'bg-violet-50 text-violet-900 ring-1 ring-violet-200',
                              e.lane === 'other' && 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {laneLabel(e.lane)}
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-800">{actionLabel(e.kind)}</td>
                        <td className="px-4 py-3 text-slate-600">{e.detail ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function WorkerNameCombobox(props: {
  query: string
  onQueryChange: (q: string) => void
  selectedId: string
  options: WarehouseWorker[]
  allLabel: string
  onSelectAll: () => void
  onSelectWorker: (w: WarehouseWorker) => void
  emptyHint: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const showClear = props.query.length > 0 || props.selectedId !== 'all'

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={props.query}
          onChange={(e) => {
            props.onQueryChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search or select worker…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-16 text-sm text-slate-800"
          autoComplete="off"
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {showClear ? (
            <button
              type="button"
              className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear name"
              onClick={() => {
                props.onSelectAll()
                setOpen(false)
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Toggle name list"
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className={cn(
              'flex w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-slate-50',
              props.selectedId === 'all' && !props.query.trim()
                ? 'bg-primary-50 font-semibold text-primary-800'
                : 'text-slate-700'
            )}
            onClick={() => {
              props.onSelectAll()
              setOpen(false)
            }}
          >
            {props.allLabel}
          </button>
          {props.options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">{props.emptyHint}</p>
          ) : (
            props.options.map((w) => (
              <button
                key={w.id}
                type="button"
                className={cn(
                  'flex w-full cursor-pointer flex-col px-3 py-2 text-left hover:bg-slate-50',
                  props.selectedId === w.id ? 'bg-primary-50' : ''
                )}
                onClick={() => {
                  props.onSelectWorker(w)
                  setOpen(false)
                }}
              >
                <span
                  className={cn(
                    'text-sm',
                    props.selectedId === w.id
                      ? 'font-semibold text-primary-800'
                      : 'font-medium text-slate-800'
                  )}
                >
                  {w.name}
                </span>
                <span className="text-[11px] text-slate-500">{roleJobLabel(w.role)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function SortChip(props: {
  active: boolean
  label: string
  icon: typeof Clock3
  onClick: () => void
}) {
  const Icon = props.icon
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn('cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
        props.active
          ? 'border-primary-400 bg-primary-50 text-primary-800'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {props.label}
    </button>
  )
}
