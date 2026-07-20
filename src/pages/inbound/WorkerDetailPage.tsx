import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/layout/PageHeader'
import { WorkerWorkPanel } from '@/components/inbound/WorkerWorkPanel'
import { useWorker } from '@/hooks/useInbound'
import { roleJobLabel } from '@/lib/shifts'
import { roleWorkTitle } from '@/lib/workerActivity'

export function WorkerDetailPage() {
  const { workerId } = useParams<{ workerId: string }>()
  const workerQ = useWorker(workerId)

  const worker = workerQ.data

  return (
    <div>
      <PageHeader
        title={worker ? worker.name : 'Worker'}
        actions={
          <Link
            to="/inbound/workers"
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workers
          </Link>
        }
      />

      {worker ? (
        <p className="mb-4 text-sm text-slate-600">
          {roleWorkTitle(worker.role)} · {roleJobLabel(worker.role)} · {worker.email}
        </p>
      ) : null}

      {!workerQ.isLoading && !worker ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Worker not found.
        </div>
      ) : (
        <WorkerWorkPanel worker={worker} loading={workerQ.isLoading} />
      )}
    </div>
  )
}
