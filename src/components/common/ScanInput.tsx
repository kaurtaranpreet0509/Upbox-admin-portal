import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Loader2, ScanBarcode } from 'lucide-react'
import { cn } from '@/lib/cn'

export function ScanInput(props: {
  placeholder?: string
  onScan: (value: string) => void | Promise<void>
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (props.disabled) {
      inputRef.current?.blur()
      return
    }
    // View-only (off-shift) wrapper uses inert — do not focus / blink caret
    if (inputRef.current?.closest('[inert]')) return
    if (props.autoFocus !== false) inputRef.current?.focus()
  }, [props.autoFocus, props.disabled])

  const submit = async (raw: string) => {
    const v = raw.trim()
    if (!v || busy || props.disabled) return
    setBusy(true)
    setFlash(null)
    try {
      await props.onScan(v)
      setFlash('ok')
      setValue('')
    } catch {
      setFlash('err')
    } finally {
      setBusy(false)
      setTimeout(() => setFlash(null), 1200)
      inputRef.current?.focus()
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void submit(value)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submit(value)
  }

  return (
    <form onSubmit={onSubmit} className={cn('w-full', props.className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm transition dark:bg-slate-900',
          flash === 'ok' && 'border-emerald-400 ring-2 ring-emerald-200',
          flash === 'err' && 'border-rose-400 ring-2 ring-rose-200',
          !flash && 'border-slate-300 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100'
        )}
      >
        <ScanBarcode className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={value}
          disabled={props.disabled || busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={props.placeholder ?? 'Scan barcode…'}
          className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-white"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={props.disabled || busy || !value.trim()}
          className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Submit scan"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
        </button>
      </div>
    </form>
  )
}
