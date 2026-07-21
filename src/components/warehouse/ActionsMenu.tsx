import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Download, Pencil, Plus, Trash2, ArrowLeftRight } from 'lucide-react'

export function ActionsMenu(props: {
  hasSelection?: boolean
  /** Supervisor-only binrack CRUD. Hidden for non-supervisors. */
  canManageBinracks?: boolean
  onNew?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onExport?: () => void
  /** Controlled open state — when set, parent owns open/close. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const controlled = props.open !== undefined
  const open = controlled ? Boolean(props.open) : internalOpen
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(open) : next
    if (!controlled) setInternalOpen(value)
    props.onOpenChange?.(value)
  }

  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const canManage = props.canManageBinracks === true

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        if (!controlled) setInternalOpen(false)
        props.onOpenChange?.(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, controlled, props.onOpenChange])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
      >
        Actions
        <ChevronDown className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {canManage ? (
            <>
              <MenuItem
                icon={Plus}
                label="New"
                onClick={() => {
                  setOpen(false)
                  props.onNew?.()
                }}
              />
              <MenuItem
                icon={Pencil}
                label="Edit"
                disabled={!props.hasSelection}
                onClick={() => {
                  setOpen(false)
                  props.onEdit?.()
                }}
              />
              <MenuItem
                icon={Trash2}
                label="Delete"
                disabled={!props.hasSelection}
                onClick={() => {
                  setOpen(false)
                  props.onDelete?.()
                }}
              />
              <div className="my-1 border-t border-slate-100" />
            </>
          ) : null}
          <MenuItem
            icon={ArrowLeftRight}
            label="Open moves management"
            onClick={() => {
              setOpen(false)
              navigate('/warehouse/moves')
            }}
          />
          <MenuItem
            icon={Download}
            label="Export current view"
            onClick={() => {
              setOpen(false)
              props.onExport?.()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

function MenuItem(props: {
  icon: typeof Plus
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  const Icon = props.icon
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className="h-4 w-4 text-slate-500" />
      {props.label}
    </button>
  )
}
