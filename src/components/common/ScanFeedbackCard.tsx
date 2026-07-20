import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/cn'

export function ScanFeedbackCard(props: {
  tone: 'success' | 'error' | 'warn'
  title: string
  detail?: string
  onDismiss?: () => void
  autoDismissMs?: number
}) {
  useEffect(() => {
    if (!props.onDismiss || !props.autoDismissMs) return
    const t = setTimeout(props.onDismiss, props.autoDismissMs)
    return () => clearTimeout(t)
  }, [props.onDismiss, props.autoDismissMs, props.title])

  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    error: 'border-rose-200 bg-rose-50 text-rose-950',
    warn: 'border-amber-200 bg-amber-50 text-amber-950',
  }[props.tone]

  const Icon = props.tone === 'error' ? AlertCircle : CheckCircle2

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', styles)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{props.title}</p>
        {props.detail ? <p className="mt-0.5 text-xs opacity-80">{props.detail}</p> : null}
      </div>
    </div>
  )
}
