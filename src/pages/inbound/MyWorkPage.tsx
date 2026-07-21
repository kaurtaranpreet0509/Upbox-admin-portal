import { PageHeader } from '@/layout/PageHeader'
import { WorkerWorkPanel } from '@/components/inbound/WorkerWorkPanel'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorker } from '@/hooks/useInbound'
import { roleWorkTitle } from '@/lib/workerActivity'

export function MyWorkPage() {
  const user = useAuthStore((s) => s.user)
  const workerQ = useWorker(user?.workerId)
  const worker = workerQ.data

  return (
    <div>
      <PageHeader title={worker ? roleWorkTitle(worker.role) : 'My work'} />
      <WorkerWorkPanel worker={worker} loading={workerQ.isLoading} />
    </div>
  )
}
