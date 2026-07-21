import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { HealthBadge } from '@/components/inventory/Badges'
import { brands } from '@/data/mockInventory'
import { useRestockStore } from '@/store/useRestockStore'
import { useToastStore } from '@/store/useToastStore'
import type { SkuInventoryRow } from '@/types/inventory'
import { needsSellerUpdate } from '@/types/inventory'

export function NotifySellerModal({
  sku,
  onClose,
}: {
  sku: SkuInventoryRow
  onClose: () => void
}) {
  const send = useRestockStore((s) => s.sendRestockRequest)
  const already = useRestockStore((s) => s.hasPendingRequest(sku.sku))
  const push = useToastStore((s) => s.push)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  const sellerName = brands.find((b) => b.id === sku.brandId)?.sellerName ?? sku.brandName

  if (!needsSellerUpdate(sku.health)) return null

  const health = sku.health

  const onConfirm = async () => {
    if (already || sending) return
    setSending(true)
    await new Promise((r) => setTimeout(r, 180))
    send({
      sku: sku.sku,
      skuName: sku.name,
      brandId: sku.brandId,
      brandName: sku.brandName,
      sellerName,
      onHand: sku.onHand,
      available: sku.available,
      reorderPoint: sku.reorderPoint,
      health,
      note: note.trim(),
    })
    push(`Notified ${sellerName} to update inventory for ${sku.sku}`)
    setSending(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notify-seller-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Restock request</p>
            <h2 id="notify-seller-title" className="font-heading mt-0.5 text-lg text-slate-900">
              Notify seller to update inventory
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{sku.name}</p>
              <HealthBadge health={sku.health} />
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500">{sku.sku}</p>
            <p className="mt-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Seller:</span> {sellerName}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Brand:</span> {sku.brandName}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
              <span>
                On hand <strong>{sku.onHand}</strong>
              </span>
              <span>
                Available <strong>{sku.available}</strong>
              </span>
              <span>
                Reorder at <strong>{sku.reorderPoint}</strong>
              </span>
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Note to seller (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Please replenish ASAP — FC pick faces are below reorder point."
              className="surface-input mt-1 w-full resize-none px-3 py-2 text-sm"
              disabled={already}
            />
          </label>

          {already ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              A restock request was already sent for this SKU.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              This sends a mock request asking the seller to update / replenish inventory for this SKU.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={already || sending}
            onClick={() => void onConfirm()}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bell className="h-4 w-4" />
            {already ? 'Already requested' : sending ? 'Sending…' : 'Notify seller'}
          </button>
        </div>
      </div>
    </div>
  )
}
