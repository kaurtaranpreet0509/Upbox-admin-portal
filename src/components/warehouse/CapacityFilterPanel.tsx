import { useEffect, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { CAPACITY_OPS, type CapacityOp, type CapacityRule, type ZoneType } from '@/types/inbound'
import { cn } from '@/lib/cn'

const ZONE_OPTIONS: { value: ZoneType; label: string }[] = [
  { value: 'goods_in', label: 'Goods In' },
  { value: 'pick', label: 'Pick' },
  { value: 'inspection', label: 'Inspection' },
]

export function CapacityFilterPanel(props: {
  open: boolean
  rules: CapacityRule[]
  zoneTypes: ZoneType[]
  onChangeRules: (rules: CapacityRule[]) => void
  onChangeZones: (zones: ZoneType[]) => void
  onClear: () => void
  onClose: () => void
}) {
  const [openCapacity, setOpenCapacity] = useState(false)
  const [openTypes, setOpenTypes] = useState(false)

  useEffect(() => {
    if (!props.open) {
      setOpenCapacity(false)
      setOpenTypes(false)
    }
  }, [props.open])

  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [props.open, props.onClose])

  if (!props.open) return null

  const hasActive =
    props.zoneTypes.length > 0 || props.rules.some((r) => r.enabled)

  const upsert = (op: CapacityOp, patch: Partial<CapacityRule>) => {
    const existing = props.rules.find((r) => r.op === op)
    if (existing) {
      props.onChangeRules(props.rules.map((r) => (r.op === op ? { ...r, ...patch } : r)))
    } else {
      props.onChangeRules([...props.rules, { op, value: 0, enabled: false, ...patch }])
    }
  }

  const ruleFor = (op: CapacityOp): CapacityRule =>
    props.rules.find((r) => r.op === op) ?? { op, value: 0, enabled: false }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">Filters</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasActive}
              className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={props.onClear}
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={props.onClose}
              className="cursor-pointer rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <Section title="Location types" open={openTypes} onToggle={() => setOpenTypes((v) => !v)}>
            <div className="space-y-2 px-4 pb-3">
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {ZONE_OPTIONS.map((z) => (
                  <label
                    key={z.value}
                    className="cursor-pointer inline-flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={props.zoneTypes.includes(z.value)}
                      onChange={(e) => {
                        if (e.target.checked) props.onChangeZones([...props.zoneTypes, z.value])
                        else props.onChangeZones(props.zoneTypes.filter((x) => x !== z.value))
                      }}
                    />
                    {z.label}
                  </label>
                ))}
              </div>
            </div>
          </Section>

          <Section
            title="Capacity"
            open={openCapacity}
            onToggle={() => setOpenCapacity((v) => !v)}
            highlight
          >
            <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
              {CAPACITY_OPS.map(({ op, label }) => {
                const rule = ruleFor(op)
                return (
                  <label
                    key={op}
                    className="cursor-pointer flex min-w-0 flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-sm text-slate-700"
                  >
                    <span className="inline-flex items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => upsert(op, { enabled: e.target.checked })}
                      />
                      {label}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={rule.value}
                      onChange={(e) =>
                        upsert(op, { value: Number(e.target.value), enabled: true })
                      }
                      className="w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    />
                  </label>
                )
              })}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section(props: {
  title: string
  open: boolean
  onToggle: () => void
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'border-b border-slate-100 last:border-b-0',
        props.highlight && props.open && 'ring-1 ring-inset ring-emerald-400'
      )}
    >
      <button
        type="button"
        onClick={props.onToggle}
        className="cursor-pointer flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2">
          {props.title}
          {props.highlight ? <Plus className="h-3.5 w-3.5 text-emerald-600" /> : null}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', props.open && 'rotate-180')} />
      </button>
      {props.open ? props.children : null}
    </div>
  )
}
