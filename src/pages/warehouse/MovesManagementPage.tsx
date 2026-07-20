import { useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import { ActionsMenu } from '@/components/warehouse/ActionsMenu'
import { ZoneTypeBadge } from '@/components/common/Badges'
import { useMoves } from '@/hooks/useInbound'
import { EmptyState } from '@/components/ui/EmptyState'
import { downloadCsv } from '@/lib/downloadCsv'

export function MovesManagementPage() {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const movesQ = useMoves(search)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div>
      <PageHeader title="Moves Management" />

      <div className="surface-card mb-4 flex flex-wrap items-center gap-2 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSearch(draft)
          }}
          placeholder="SKU / Batch / Location / User"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setSearch(draft)}
          className="cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <ActionsMenu
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

      {toast ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}

      {movesQ.isLoading ? <LoadingPanel label="Loading moves…" /> : null}
      {movesQ.data && movesQ.data.length === 0 ? (
        <EmptyState title="No moves found" />
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
    </div>
  )
}
