import { useEffect, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import {
  ZONE_LABELS,
  type MoveState,
  type ZoneType,
} from '@/types/inbound'
import { cn } from '@/lib/cn'

const STATE_OPTIONS: MoveState[] = ['Open', 'In Progress', 'Complete']
const ZONE_OPTIONS = (Object.keys(ZONE_LABELS) as ZoneType[]).map((value) => ({
  value,
  label: ZONE_LABELS[value],
}))

export type MovesFilters = {
  states: MoveState[]
  fromZones: ZoneType[]
  toZones: ZoneType[]
  usernames: string[]
}

export function MovesFilterPanel(props: {
  open: boolean
  filters: MovesFilters
  usernameOptions: string[]
  onChange: (next: MovesFilters) => void
  onClear: () => void
  onClose: () => void
}) {
  const [openState, setOpenState] = useState(false)
  const [openFrom, setOpenFrom] = useState(false)
  const [openTo, setOpenTo] = useState(false)
  const [openUser, setOpenUser] = useState(false)

  useEffect(() => {
    if (!props.open) {
      setOpenState(false)
      setOpenFrom(false)
      setOpenTo(false)
      setOpenUser(false)
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
    props.filters.states.length > 0 ||
    props.filters.fromZones.length > 0 ||
    props.filters.toZones.length > 0 ||
    props.filters.usernames.length > 0

  const toggle = <T extends string>(key: keyof MovesFilters, value: T) => {
    const list = props.filters[key] as T[]
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
    props.onChange({ ...props.filters, [key]: next })
  }

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
          <Section title="State" open={openState} onToggle={() => setOpenState((v) => !v)}>
            <CheckboxRow
              options={STATE_OPTIONS.map((s) => ({ value: s, label: s }))}
              selected={props.filters.states}
              onToggle={(v) => toggle('states', v as MoveState)}
            />
          </Section>

          <Section title="From zone" open={openFrom} onToggle={() => setOpenFrom((v) => !v)}>
            <CheckboxRow
              options={ZONE_OPTIONS}
              selected={props.filters.fromZones}
              onToggle={(v) => toggle('fromZones', v as ZoneType)}
            />
          </Section>

          <Section title="To zone" open={openTo} onToggle={() => setOpenTo((v) => !v)}>
            <CheckboxRow
              options={ZONE_OPTIONS}
              selected={props.filters.toZones}
              onToggle={(v) => toggle('toZones', v as ZoneType)}
            />
          </Section>

          <Section title="Worker" open={openUser} onToggle={() => setOpenUser((v) => !v)}>
            {props.usernameOptions.length === 0 ? (
              <p className="px-4 pb-3 text-sm text-slate-500">No workers in moves yet.</p>
            ) : (
              <CheckboxRow
                options={props.usernameOptions.map((u) => ({ value: u, label: u }))}
                selected={props.filters.usernames}
                onToggle={(v) => toggle('usernames', v)}
              />
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function CheckboxRow(props: {
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 pb-3">
      {props.options.map((opt) => (
        <label
          key={opt.value}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
        >
          <input
            type="checkbox"
            checked={props.selected.includes(opt.value)}
            onChange={() => props.onToggle(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

function Section(props: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={props.onToggle}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        {props.title}
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', props.open && 'rotate-180')} />
      </button>
      {props.open ? props.children : null}
    </div>
  )
}
