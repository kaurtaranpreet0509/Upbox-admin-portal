import { Navigate, Outlet, Link } from 'react-router-dom'
import { useEffect, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorker } from '@/hooks/useInbound'
import { isOnShift } from '@/lib/shifts'
import { LoadingPanel } from '@/components/common/UpboxLoading'

/**
 * When off shift: pages are visible in grayscale / read-only.
 * Workers, My work, and Team work stay outside this gate (full access).
 */
export function RequireOnShift() {
  const user = useAuthStore((s) => s.user)
  const workerQ = useWorker(user?.workerId)

  if (!user?.workerId) {
    return <Navigate to="/unauthorized" replace />
  }

  if (workerQ.isLoading && !workerQ.data) {
    return (
      <div className="py-16">
        <LoadingPanel label="Checking shift…" />
      </div>
    )
  }

  const worker = workerQ.data
  if (!worker) {
    return <Navigate to="/unauthorized" replace />
  }

  const onShift = isOnShift(worker)

  return (
    <div className={onShift ? undefined : 'grayscale'}>
      {!onShift ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-800">
          <span>View only — start your shift to work on this screen.</span>
          <Link
            to="/inbound/my-work"
            state={{ needShift: true }}
            className="cursor-pointer rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
          >
            Start shift
          </Link>
        </div>
      ) : null}
      <ViewOnlyContent onShift={onShift} />
    </div>
  )
}

function ViewOnlyContent(props: { onShift: boolean }) {
  // Drop focus so scan inputs do not keep a blinking caret in view-only mode
  useEffect(() => {
    if (props.onShift) return
    const el = document.activeElement
    if (el instanceof HTMLElement) el.blur()
  }, [props.onShift])

  const blockIfViewOnly = (e: MouseEvent | KeyboardEvent | FormEvent) => {
    if (props.onShift) return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      className={props.onShift ? undefined : 'select-none'}
      // Block actions without inert/pointer-events-none so hover still shows hand cursor
      onClickCapture={blockIfViewOnly}
      onSubmitCapture={blockIfViewOnly}
      onDoubleClickCapture={blockIfViewOnly}
      onKeyDownCapture={(e) => {
        if (props.onShift) return
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <Outlet />
    </div>
  )
}
