import { useEffect, useMemo, useState } from 'react'
import type { BinrackRow, ZoneType } from '@/types/inbound'
import {
  formatLocationCode,
  hierarchyPathForLocation,
  parseLocationCode,
  quadrantLabel,
} from '@/lib/locationCode'

export type BinrackFormValues = {
  locationCode: string
  zoneType: ZoneType
  storageGroups: string
  w: number
  h: number
  d: number
  maxUnits: number
  hierarchyStackId: string
  /** Pick shelf parts */
  quadrant: string
  aisle: string
  rack: string
  bay: string
  shelf: string
  scanBarcode: string
}

const EMPTY: BinrackFormValues = {
  locationCode: '',
  zoneType: 'pick',
  storageGroups: '',
  w: 1,
  h: 1,
  d: 1,
  maxUnits: 100,
  hierarchyStackId: 'bay-dock-1',
  quadrant: 'W',
  aisle: 'A',
  rack: 'R1',
  bay: 'B1',
  shelf: '1',
  scanBarcode: '',
}

const DOCK_OPTIONS = [
  { id: 'bay-dock-1', label: 'West → Dock staging → Bay 1', path: ['wh-main', 'quad-w', 'aisle-dock', 'bay-dock-1'] },
  { id: 'bay-dock-2', label: 'West → Dock staging → Bay 2', path: ['wh-main', 'quad-w', 'aisle-dock', 'bay-dock-2'] },
]

function pathForDock(stackId: string): string[] {
  return DOCK_OPTIONS.find((o) => o.id === stackId)?.path ?? DOCK_OPTIONS[0]!.path
}

export function BinrackFormModal(props: {
  open: boolean
  mode: 'create' | 'edit'
  initial?: BinrackRow | null
  /** When set, zone type is locked to this tab (Goods In / Binracks / Inspection). */
  lockedZoneType?: ZoneType
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
        props.initial.hierarchyPath[props.initial.hierarchyPath.length - 1] ?? 'bay-dock-1'
      const parts = parseLocationCode(props.initial.locationCode)
      setValues({
        locationCode: props.initial.locationCode,
        zoneType: props.initial.zoneType,
        storageGroups: props.initial.storageGroups.join(', '),
        w: props.initial.capacity.w,
        h: props.initial.capacity.h,
        d: props.initial.capacity.d,
        maxUnits: props.initial.maxUnits,
        hierarchyStackId: stack.startsWith('bay-dock') ? stack : 'bay-dock-1',
        quadrant: parts?.quadrant ?? 'W',
        aisle: parts?.aisle ?? 'A',
        rack: parts?.rack ?? 'R1',
        bay: parts?.bay ?? 'B1',
        shelf: parts?.shelf ?? '1',
        scanBarcode: props.initial.scanBarcode ?? '',
      })
    } else {
      const zone = props.lockedZoneType ?? 'pick'
      setValues({
        ...EMPTY,
        zoneType: zone,
        maxUnits: zone === 'goods_in' ? 12 : zone === 'inspection' ? 200 : 20,
        storageGroups:
          zone === 'goods_in'
            ? 'Dock floor, Pallet bay'
            : zone === 'inspection'
              ? 'QA hold'
              : '',
        hierarchyStackId: 'bay-dock-1',
        w: zone === 'goods_in' ? 2.4 : 1,
        h: zone === 'goods_in' ? 1.2 : 1,
        d: zone === 'goods_in' ? 1.0 : 1,
      })
    }
    setError(null)
  }, [props.open, props.mode, props.initial, props.lockedZoneType])

  const pickCode = useMemo(
    () =>
      formatLocationCode(
        values.quadrant,
        values.aisle,
        values.rack,
        values.bay,
        values.shelf
      ),
    [values.quadrant, values.aisle, values.rack, values.bay, values.shelf]
  )

  if (!props.open) return null

  const set = <K extends keyof BinrackFormValues>(key: K, value: BinrackFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const isGoodsIn = values.zoneType === 'goods_in'
  const isPick = values.zoneType === 'pick'
  const zoneLocked = !!props.lockedZoneType

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="font-heading text-lg text-slate-900">
          {props.mode === 'create'
            ? isGoodsIn
              ? 'New dock bay'
              : isPick
                ? 'New shelf location'
                : 'New location'
            : isGoodsIn
              ? 'Edit dock bay'
              : isPick
                ? 'Edit shelf location'
                : 'Edit location'}
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {!isPick ? (
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Location code</span>
              <input
                value={values.locationCode}
                onChange={(e) => set('locationCode', e.target.value)}
                placeholder={isGoodsIn ? 'e.g. D-3' : 'e.g. INSP-INTAKE'}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </label>
          ) : (
            <>
              <label className="cursor-pointer block text-sm">
                <span className="font-medium text-slate-700">Quadrant</span>
                <select
                  value={values.quadrant}
                  onChange={(e) => set('quadrant', e.target.value)}
                  className="mt-1 w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {(['W', 'N', 'S', 'E'] as const).map((q) => (
                    <option key={q} value={q}>
                      {quadrantLabel(q)} ({q})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Aisle</span>
                <input
                  value={values.aisle}
                  onChange={(e) => set('aisle', e.target.value.toUpperCase())}
                  placeholder="A"
                  maxLength={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Rack</span>
                <input
                  value={values.rack}
                  onChange={(e) => set('rack', e.target.value.toUpperCase())}
                  placeholder="R1"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Bay</span>
                <input
                  value={values.bay}
                  onChange={(e) => set('bay', e.target.value.toUpperCase())}
                  placeholder="B1"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Shelf</span>
                <input
                  value={values.shelf}
                  onChange={(e) => set('shelf', e.target.value.replace(/\D/g, ''))}
                  placeholder="3"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Location code</span>
                <input
                  value={pickCode}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono font-bold text-slate-900"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Format: Quadrant.Aisle.Rack.Bay.Shelf — includes quadrant so codes stay unique
                  across the warehouse.
                </p>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Scan barcode</span>
                <input
                  value={values.scanBarcode}
                  onChange={(e) => set('scanBarcode', e.target.value)}
                  placeholder="e.g. 8908004279854"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Physical barcode scanned during assign / putaway (unchanged from label print).
                </p>
              </label>
            </>
          )}

          <label className="cursor-pointer block text-sm">
            <span className="font-medium text-slate-700">Zone type</span>
            <select
              value={values.zoneType}
              disabled={zoneLocked}
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
              className="mt-1 w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
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

          {isGoodsIn ? (
            <label className="cursor-pointer block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Hierarchy location</span>
              <select
                value={values.hierarchyStackId}
                onChange={(e) => set('hierarchyStackId', e.target.value)}
                className="mt-1 w-full cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {DOCK_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
              let locationCode = values.locationCode.trim().toUpperCase()
              let hierarchyPath: string[]

              if (isPick) {
                if (!values.aisle.trim() || !values.rack.trim() || !values.bay.trim() || !values.shelf.trim()) {
                  setError('Quadrant, aisle, rack, bay, and shelf are required')
                  return
                }
                locationCode = pickCode
                if (!parseLocationCode(locationCode)) {
                  setError('Invalid location — use e.g. W.A.R1.B1.3')
                  return
                }
                if (!values.scanBarcode.trim()) {
                  setError('Scan barcode is required for pick shelves')
                  return
                }
                const parts = parseLocationCode(locationCode)!
                hierarchyPath = hierarchyPathForLocation(parts)
              } else {
                if (!locationCode) {
                  setError('Location code is required')
                  return
                }
                hierarchyPath = isGoodsIn
                  ? pathForDock(values.hierarchyStackId)
                  : ['wh-main', 'quad-w']
              }

              setBusy(true)
              setError(null)
              try {
                await props.onSubmit({
                  ...values,
                  locationCode,
                  scanBarcode: values.scanBarcode.trim(),
                  hierarchyPath,
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
