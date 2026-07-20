import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/layout/PageHeader'
import { WorkerWorkPanel } from '@/components/inbound/WorkerWorkPanel'
import { useAuthStore } from '@/store/useAuthStore'
import { useEndShift, useStartShift, useWorker } from '@/hooks/useInbound'
import { isOnShift } from '@/lib/shifts'
import { roleWorkTitle } from '@/lib/workerActivity'
import { roleHomePath } from '@/routes/roleRoutes'

export function MyWorkPage() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()
  const needShift = Boolean((location.state as { needShift?: boolean } | null)?.needShift)
  const workerQ = useWorker(user?.workerId)
  const startShift = useStartShift()
  const endShift = useEndShift()
  const [shiftError, setShiftError] = useState<string | null>(null)

  const worker = workerQ.data

  const onStart = async () => {
    if (!user?.workerId) return
    setShiftError(null)
    try {
      await startShift.mutateAsync(user.workerId)
      navigate(roleHomePath(user.roles ?? []), { replace: true })
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'Could not start shift')
    }
  }

  const onEnd = async () => {
    if (!user?.workerId) return
    setShiftError(null)
    try {
      await endShift.mutateAsync(user.workerId)
    } catch (e) {
      setShiftError(e instanceof Error ? e.message : 'Could not end shift')
    }
  }

  return (
    <div>
      <PageHeader title={worker ? roleWorkTitle(worker.role) : 'My work'} />

      {needShift && worker && !isOnShift(worker) ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Start your shift before you can do any warehouse work.
        </div>
      ) : null}

      <WorkerWorkPanel
        worker={worker}
        loading={workerQ.isLoading}
        shiftControls={{
          onStart: () => void onStart(),
          onEnd: () => void onEnd(),
          startPending: startShift.isPending,
          endPending: endShift.isPending,
          error: shiftError,
          highlightStart: needShift,
        }}
      />
    </div>
  )
}
