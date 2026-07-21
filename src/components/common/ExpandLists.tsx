import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { MasterCarton, ProductStatus, ProductUnit } from '@/types/inbound'
import { CartonStatusBadge } from '@/components/common/Badges'
import { cn } from '@/lib/cn'

export type ProductRow = Pick<
  ProductUnit,
  'id' | 'sku' | 'barcode' | 'description' | 'status' | 'stagingContainerLabel'
> & {
  cartonId?: string
  assignedRackLabel?: string | null
}

export function ProductMiniTable(props: {
  products: ProductRow[]
  showCarton?: boolean
  showBag?: boolean
  showRack?: boolean
  selectedIds?: Set<string>
  onToggle?: (id: string) => void
}) {
  if (props.products.length === 0) {
    return <p className="py-4 text-sm text-slate-500">No products.</p>
  }
  const selectable = !!props.onToggle
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {selectable ? <th className="px-3 py-2" /> : null}
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Barcode</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Status</th>
            {props.showCarton ? <th className="px-3 py-2">Carton</th> : null}
            {props.showBag ? <th className="px-3 py-2">Bag</th> : null}
            {props.showRack ? <th className="px-3 py-2">Rack</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {props.products.map((p) => (
            <tr
              key={p.id}
              className={cn(props.selectedIds?.has(p.id) && 'bg-sky-50/70')}
            >
              {selectable ? (
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={props.selectedIds?.has(p.id) ?? false}
                    onChange={() => props.onToggle?.(p.id)}
                  />
                </td>
              ) : null}
              <td className="px-3 py-2 font-semibold text-slate-900">{p.sku}</td>
              <td className="px-3 py-2 font-mono text-xs">{p.barcode}</td>
              <td className="px-3 py-2 text-slate-600">{p.description}</td>
              <td className="px-3 py-2">
                <StatusPill status={p.status} />
              </td>
              {props.showCarton ? (
                <td className="px-3 py-2 font-mono text-xs">{p.cartonId ?? '—'}</td>
              ) : null}
              {props.showBag ? (
                <td className="px-3 py-2 font-mono text-xs">{p.stagingContainerLabel ?? '—'}</td>
              ) : null}
              {props.showRack ? (
                <td className="px-3 py-2 font-mono text-xs font-bold text-emerald-800">
                  {p.assignedRackLabel ?? '—'}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ status }: { status: ProductStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
        status === 'PENDING' && 'bg-slate-100 text-slate-700',
        status === 'STAGED' && 'bg-emerald-100 text-emerald-800',
        status === 'ASSIGNED' && 'bg-sky-100 text-sky-800',
        status === 'PLACED' && 'bg-violet-100 text-violet-800',
        status === 'DAMAGED' && 'bg-rose-100 text-rose-800'
      )}
    >
      {status.toLowerCase()}
    </span>
  )
}

/** Click carton row → expand product list */
export function CartonExpandList(props: {
  cartons: MasterCarton[]
  emptyLabel?: string
  title?: string
  brandName?: (brandId: string | null) => string
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (props.cartons.length === 0) {
    return (
      <div className="surface-panel px-4 py-10 text-center text-sm text-slate-500">
        {props.emptyLabel ?? 'No cartons.'}
      </div>
    )
  }

  return (
    <section className="surface-panel overflow-hidden">
      {props.title ? (
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
          {props.title}
        </h2>
      ) : null}
      <div className="divide-y divide-slate-100">
        {props.cartons.map((c) => {
          const open = openId === c.id
          const pending = c.products.filter((p) => p.status === 'PENDING').length
          return (
            <div key={c.id}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50"
                onClick={() => setOpenId(open ? null : c.id)}
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="font-semibold text-slate-900">{c.id}</span>
                <span className="font-mono text-xs text-slate-500">{c.barcode}</span>
                {props.brandName ? (
                  <span className="text-xs font-semibold text-slate-600">
                    {props.brandName(c.brandId)}
                  </span>
                ) : null}
                <CartonStatusBadge status={c.status} />
                <span className="ml-auto text-xs text-slate-500">
                  {c.productCount} products
                  {pending > 0 && pending < c.productCount ? ` · ${pending} pending` : ''}
                </span>
              </button>
              {open ? (
                <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 pl-12">
                  <ProductMiniTable products={c.products} showBag />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Click trolley/bag → expand products (optional multi-select) */
export function TrolleyExpandList(props: {
  bags: Array<{
    label: string
    productCount: number
    cartonIds: string[]
    products: ProductRow[]
  }>
  emptyLabel?: string
  title?: string
  selectedIds?: Set<string>
  onToggleProduct?: (id: string) => void
  onToggleBag?: (productIds: string[]) => void
}) {
  const [openLabel, setOpenLabel] = useState<string | null>(null)

  if (props.bags.length === 0) {
    return (
      <div className="surface-panel px-4 py-10 text-center text-sm text-slate-500">
        {props.emptyLabel ?? 'No bags or trolleys yet.'}
      </div>
    )
  }

  return (
    <section className="surface-panel overflow-hidden">
      {props.title ? (
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
          {props.title}
        </h2>
      ) : null}
      <div className="divide-y divide-slate-100">
        {props.bags.map((bag) => {
          const open = openLabel === bag.label
          const ids = bag.products.map((p) => p.id)
          const allSelected =
            !!props.selectedIds && ids.length > 0 && ids.every((id) => props.selectedIds!.has(id))
          const empty = bag.productCount === 0
          return (
            <div key={bag.label}>
              <div className="flex w-full items-center gap-2 px-4 py-3 hover:bg-indigo-50/50">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                  onClick={() => setOpenLabel(open ? null : bag.label)}
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-mono text-sm font-bold text-amber-950 ring-1 ring-amber-200">
                    {bag.label}
                  </span>
                  {empty ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-500">
                      Empty
                    </span>
                  ) : (
                    <>
                      <span className="text-sm text-slate-600">
                        {bag.productCount} product{bag.productCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-xs text-slate-400">
                        · {bag.cartonIds.length} carton{bag.cartonIds.length === 1 ? '' : 's'}
                      </span>
                    </>
                  )}
                </button>
                {props.onToggleBag && !empty ? (
                  <label
                    className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={allSelected}
                      onChange={() => props.onToggleBag?.(ids)}
                    />
                    All
                  </label>
                ) : null}
              </div>
              {open ? (
                <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 pl-12">
                  {empty ? (
                    <p className="py-3 text-sm text-slate-500">
                      Empty — scan this label during unpack to fill it.
                    </p>
                  ) : (
                    <ProductMiniTable
                      products={bag.products}
                      showCarton
                      selectedIds={props.selectedIds}
                      onToggle={props.onToggleProduct}
                    />
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Click group (rack / carton / label) → expand products */
export function GroupedProductExpandList(props: {
  groups: Array<{
    key: string
    label: string
    sublabel?: string
    products: ProductRow[]
  }>
  title?: string
  emptyLabel?: string
  showCarton?: boolean
  showBag?: boolean
  showRack?: boolean
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  if (props.groups.length === 0) {
    return (
      <div className="surface-panel px-4 py-10 text-center text-sm text-slate-500">
        {props.emptyLabel ?? 'Nothing to show.'}
      </div>
    )
  }

  return (
    <section className="surface-panel overflow-hidden">
      {props.title ? (
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
          {props.title}
        </h2>
      ) : null}
      <div className="divide-y divide-slate-100">
        {props.groups.map((g) => {
          const open = openKey === g.key
          return (
            <div key={g.key}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/50"
                onClick={() => setOpenKey(open ? null : g.key)}
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="font-semibold text-slate-900">{g.label}</span>
                {g.sublabel ? <span className="text-xs text-slate-500">{g.sublabel}</span> : null}
                <span className="ml-auto text-xs text-slate-500">
                  {g.products.length} product{g.products.length === 1 ? '' : 's'}
                </span>
              </button>
              {open ? (
                <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 pl-12">
                  <ProductMiniTable
                    products={g.products}
                    showCarton={props.showCarton}
                    showBag={props.showBag}
                    showRack={props.showRack}
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
