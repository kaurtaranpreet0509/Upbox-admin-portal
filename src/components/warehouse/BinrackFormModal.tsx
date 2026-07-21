import { useEffect, useState } from 'react'
import type { BinrackRow, ZoneType } from '@/types/inbound'

export type BinrackFormValues = {
  locationCode: string
  zoneType: ZoneType
  storageGroups: string
  w: number
  h: number
  d: number
  maxUnits: number
  hierarchyStackId: string
}

const EMPTY: BinrackFormValues = {
  locationCode: '',
  zoneType: 'pick',
  storageGroups: '',
  w: 1,
  h: 1,
  d: 1,
  maxUnits: 100,
  hierarchyStackId: 'stack-a1',
}

const STACK_OPTIONS = [
  { id: 'bay-dock-1', label: 'Warehouse West → Dock staging → Bay 1' },
  { id: 'bay-dock-2', label: 'Warehouse West → Dock staging → Bay 2' },
  { id: 'stack-a1', label: 'Warehouse West → Aisle A → Bay 1' },
  { id: 'stack-a2', label: 'Warehouse West → Aisle A → Bay 2' },
  { id: 'stack-b1', label: 'Warehouse West → Aisle B → Bay 1' },
  { id: 'stack-b2', label: 'Warehouse West → Aisle B → Bay 2' },
]

function pathForStack(stackId: string): string[] {
  if (stackId.startsWith('bay-dock')) return ['zone-west', 'aisle-dock', stackId]
  if (stackId.startsWith('stack-a')) return ['zone-west', 'aisle-a', stackId]
  return ['zone-west', 'aisle-b', stackId]
}

export function BinrackFormModal(props: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: BinrackRow | null
  onClose: () => void
  onSubmit: (values: BinrackFormValues & { hierarchyPath: string[] }) => Promise<void>
}) {
  const [values, setValues] = useState<BinrackFormValues>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    if (props.mode === 'edit' && props.initial) {
      const stack =
        props.initial.hierarchyPath[props.initial.hierarchyPath.length - 1] ?? 'stack-a1'
      setValues({
        locationCode: props.initial.locationCode,
        zoneType: props.initial.zoneType,
        storageGroups: props.initial.storageGroups.join(', '),
        w: props.initial.capacity.w,
        h: props.initial.capacity.h,
        d: props.initial.capacity.d,
        maxUnits: props.initial.maxUnits,
        hierarchyStackId: stack,
      })
    } else {
      setValues(EMPTY)
    }
    setError(null)
  }, [props.open, props.mode, props.initial])

  if (!props.open) return null

  const set = <K extends keyof BinrackFormValues>(key: K, value: BinrackFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const isGoodsIn = values.zoneType === 'goods_in'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="font-heading text-lg text-slate-900">
          {props.mode === 'create'
            ? isGoodsIn
              ? 'New dock bay'
              : 'New location'
            : isGoodsIn
              ? 'Edit dock bay'
              : 'Edit location'}
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Location code</span>
            <input
              value={values.locationCode}
              onChange={(e) => set('locationCode', e.target.value)}
              placeholder={isGoodsIn ? 'e.g. D-3' : 'e.g. A-1-2-P'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </label>

          <label className="cursor-pointer block text-sm">
            <span className="font-medium text-slate-700">Zone type</span>
            <select
              value={values.zoneType}
              onChange={(e) => {
                const zone = e.target.value as ZoneType
                set('zoneType', zone)
                if (zone === 'goods_in') {
                  setValues((v) => ({
                    ...v,
                    zoneType: zone,
                    maxUnits: v.maxUnits > 50 ? 12 : v.maxUnits,
                    w: 2.4,
                    h: 1.2,
                    d: 1.0,
                    storageGroups: v.storageGroups || 'Dock floor, Pallet bay',
                    hierarchyStackId: v.hierarchyStackId.startsWith('bay-dock')
                      ? v.hierarchyStackId
                      : 'bay-dock-1',
                  }))
                }
              }}
              className="mt-1 w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="goods_in">Goods In (carton staging)</option>
              <option value="pick">Pick (product shelf)</option>
              <option value="inspection">Inspection</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">
              {isGoodsIn ? 'Max cartons' : 'Max units'}
            </span>
            <input
              type="number"
              min={1}
              value={values.maxUnits}
              onChange={(e) => set('maxUnits', Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">
              {isGoodsIn ? 'Staging labels (comma-separated)' : 'Storage groups (comma-separated)'}
            </span>
            <input
              value={values.storageGroups}
              onChange={(e) => set('storageGroups', e.target.value)}
              placeholder={isGoodsIn ? 'Dock floor, Pallet bay' : 'Nike, Adidas'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">{isGoodsIn ? 'Bay width (m)' : 'Width'}</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={values.w}
              onChange={(e) => set('w', Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">{isGoodsIn ? 'Bay height (m)' : 'Height'}</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={values.h}
              onChange={(e) => set('h', Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">{isGoodsIn ? 'Bay depth (m)' : 'Depth'}</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={values.d}
              onChange={(e) => set('d', Number(e.target.value) || 1)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="cursor-pointer block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Hierarchy location</span>
            <select
              value={values.hierarchyStackId}
              onChange={(e) => set('hierarchyStackId', e.target.value)}
              className="mt-1 w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {STACK_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
            onClick={props.onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            className="cursor-pointer rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-40"
            onClick={async () => {
              if (!values.locationCode.trim()) {
                setError('Location code is required')
                return
              }
              setBusy(true)
              setError(null)
              try {
                await props.onSubmit({
                  ...values,
                  locationCode: values.locationCode.trim().toUpperCase(),
                  hierarchyPath: pathForStack(values.hierarchyStackId),
                })
                props.onClose()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Save failed')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Saving…' : props.mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
