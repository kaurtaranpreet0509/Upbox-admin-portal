import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
import type { HierarchyNode } from '@/types/inbound'
import { cn } from '@/lib/cn'

function collectIds(node: HierarchyNode): string[] {
  const kids = node.children?.flatMap(collectIds) ?? []
  return [node.id, ...kids]
}

function NodeRow(props: {
  node: HierarchyNode
  depth: number
  selected: Set<string>
  onToggle: (id: string, childIds: string[]) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = !!props.node.children?.length
  const childIds = collectIds(props.node).slice(1)
  const checked = props.selected.has(props.node.id)

  return (
    <div>
      <label
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100/80"
        style={{ marginLeft: props.depth * 16 }}
      >
        <button
          type="button"
          className="cursor-pointer shrink-0 text-slate-400"
          onClick={(e) => {
            e.preventDefault()
            setOpen((v) => !v)
          }}
          disabled={!hasChildren}
          aria-label="Expand"
        >
          {hasChildren ? (
            open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => props.onToggle(props.node.id, childIds)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="min-w-0 flex-1 font-medium text-slate-800">{props.node.label}</span>
        <span className="shrink-0 text-[11px] capitalize text-slate-500">{props.node.type}</span>
      </label>
      {open && hasChildren ? (
        <div className="mt-1.5 space-y-1.5">
          {props.node.children?.map((child) => (
            <NodeRow
              key={child.id}
              node={child}
              depth={props.depth + 1}
              selected={props.selected}
              onToggle={props.onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function HierarchyPickerModal(props: {
  open: boolean
  nodes: HierarchyNode[]
  selectedIds: string[]
  onClose: () => void
  onApply: (ids: string[]) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(props.selectedIds))
  const [zonesOpen, setZonesOpen] = useState(true)

  useEffect(() => {
    if (props.open) {
      setSelected(new Set(props.selectedIds))
      setZonesOpen(true)
    }
  }, [props.open, props.selectedIds])

  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [props.open, props.onClose])

  if (!props.open) return null

  const hasActive = selected.size > 0 || props.selectedIds.length > 0

  const commit = (next: Set<string>) => {
    setSelected(next)
    props.onApply([...next])
  }

  const toggle = (id: string, childIds: string[]) => {
    const next = new Set(selected)
    const turningOn = !next.has(id)
    if (turningOn) {
      next.add(id)
      childIds.forEach((c) => next.add(c))
    } else {
      next.delete(id)
      childIds.forEach((c) => next.delete(c))
    }
    commit(next)
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
          <span className="text-sm font-semibold text-slate-800">Hierarchy</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasActive}
              className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => commit(new Set())}
            >
              Clear hierarchy
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
          <div className="border-b border-slate-100 last:border-b-0">
            <button
              type="button"
              onClick={() => setZonesOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <span>Zones</span>
              <ChevronDown
                className={cn('h-4 w-4 text-slate-400 transition', zonesOpen && 'rotate-180')}
              />
            </button>
            {zonesOpen ? (
              <div className="space-y-1.5 px-4 pb-4">
                {props.nodes.map((n) => (
                  <NodeRow
                    key={n.id}
                    node={n}
                    depth={0}
                    selected={selected}
                    onToggle={toggle}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
