export function LoadingPanel({ label = 'Loading…', hint }: { label?: string; hint?: string }) {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
