import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Loader2, ScanBarcode } from 'lucide-react'
import { cn } from '@/lib/cn'

function focusScanField(el: HTMLInputElement | null) {
  if (!el || el.disabled || el.closest('[inert]')) return
  el.focus({ preventScroll: true })
  // Keep caret ready for the next hardware-scanner burst
  const len = el.value.length
  try {
    el.setSelectionRange(len, len)
  } catch {
    /* some input types ignore selection */
  }
}

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

  const refocus = () => {
    // After React unlocks the field / after a step swap remounts this input
    requestAnimationFrame(() => {
      focusScanField(inputRef.current)
      window.setTimeout(() => focusScanField(inputRef.current), 0)
      window.setTimeout(() => focusScanField(inputRef.current), 50)
      window.setTimeout(() => focusScanField(inputRef.current), 150)
    })
  }

  useEffect(() => {
    if (props.disabled) {
      inputRef.current?.blur()
      return
    }
    if (props.autoFocus === false) return
    refocus()
  }, [props.autoFocus, props.disabled, props.placeholder])

  useEffect(() => {
    if (!busy && !props.disabled && props.autoFocus !== false) {
      refocus()
    }
  }, [busy, props.disabled, props.autoFocus])

  const submit = async (raw: string) => {
    const v = raw.trim()
    if (!v || busy || props.disabled) return
    setBusy(true)
    setFlash(null)
    try {
      await props.onScan(v)
      setFlash('ok')
    } catch {
      setFlash('err')
    } finally {
      // Always clear so the next hardware scan replaces the previous code
      // (failed scans used to leave the old barcode and required manual delete)
      setValue('')
      setBusy(false)
      window.setTimeout(() => setFlash(null), 1200)
      refocus()
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
          !flash &&
            'border-slate-300 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100'
        )}
      >
        <ScanBarcode className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={value}
          // Keep focusable while scanning — `disabled` steals focus from scanners
          readOnly={busy}
          disabled={props.disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={props.placeholder ?? 'Scan barcode…'}
          className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-white"
          autoComplete="off"
          spellCheck={false}
          inputMode="none"
        />
        <button
          type="submit"
          disabled={props.disabled || busy || !value.trim()}
          // Don’t move focus to the button when tapping submit
          onMouseDown={(e) => e.preventDefault()}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Submit scan"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
        </button>
      </div>
    </form>
  )
}
