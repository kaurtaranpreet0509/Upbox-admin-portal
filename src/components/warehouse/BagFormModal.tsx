import { useEffect, useState } from 'react'

export function BagFormModal(props: {
  open: boolean
  mode: 'create' | 'edit'
  initialLabel?: string | null
  onClose: () => void
  onSubmit: (label: string) => Promise<void>
}) {
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    setLabel(props.mode === 'edit' ? (props.initialLabel ?? '') : '')
    setError(null)
  }, [props.open, props.mode, props.initialLabel])

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="font-heading text-lg text-slate-900">
          {props.mode === 'create' ? 'New bag / trolley' : 'Edit bag / trolley'}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Label must be unique and not already used as a carton, product, or rack barcode.
        </p>

        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-700">Bag / trolley label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. NHHG23638838"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            autoFocus
          />
        </label>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !label.trim()}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setError(null)
                try {
                  await props.onSubmit(label.trim())
                  props.onClose()
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Save failed')
                } finally {
                  setBusy(false)
                }
              })()
            }}
            className="cursor-pointer rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Saving…' : props.mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
