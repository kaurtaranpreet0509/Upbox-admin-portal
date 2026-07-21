import { useMemo, useState } from 'react'
import { PageHeader } from '@/layout/PageHeader'
import { ScanInput } from '@/components/common/ScanInput'
import { ScanFeedbackCard } from '@/components/common/ScanFeedbackCard'
import { CartonStatusBadge } from '@/components/common/Badges'
import { CartonExpandList } from '@/components/common/ExpandLists'
import { LoadingPanel } from '@/components/common/UpboxLoading'
import {
  useBrands,
  useOpenReceivedCarton,
  useReceivedCartons,
  useScanProductToStaging,
  useSendProductToInspection,
} from '@/hooks/useInbound'
import { useAuthStore } from '@/store/useAuthStore'
import { inboundService } from '@/services/inbound.service'
import type { MasterCarton } from '@/types/inbound'
import { cn } from '@/lib/cn'

type Step = 'scan_carton' | 'scan_bag' | 'scan_products'
type ProductMode = 'stage' | 'damage'

export function UnpackPage() {
  const user = useAuthStore((s) => s.user)
  const unpackerId = user?.workerId ?? null
  const cartonsQ = useReceivedCartons()
  const brandsQ = useBrands()
  const openMut = useOpenReceivedCarton()
  const stageMut = useScanProductToStaging()
  const damageMut = useSendProductToInspection()

  const brandName = (brandId: string | null | undefined) =>
    brandsQ.data?.find((b) => b.id === brandId)?.name ?? brandId ?? '—'

  const [step, setStep] = useState<Step>('scan_carton')
  const [productMode, setProductMode] = useState<ProductMode>('stage')
  const [carton, setCarton] = useState<MasterCarton | null>(null)
  const [bagLabel, setBagLabel] = useState('')
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'warn'
    title: string
    detail?: string
  } | null>(null)

  const staged = useMemo(
    () =>
      carton?.products.filter(
        (p) => p.status === 'STAGED' || p.status === 'ASSIGNED' || p.status === 'PLACED'
      ).length ?? 0,
    [carton]
  )
  const damaged = useMemo(
    () => carton?.products.filter((p) => p.status === 'DAMAGED').length ?? 0,
    [carton]
  )
  const pending = useMemo(
    () => carton?.products.filter((p) => p.status === 'PENDING').length ?? 0,
    [carton]
  )

  const closeCarton = () => {
    setCarton(null)
    setStep('scan_carton')
    setBagLabel('')
  }

  return (
    <div>
      <PageHeader title="Unpack" />

      {carton ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="font-semibold text-slate-900">
            {carton.id} · {brandName(carton.brandId)} · Staged {staged}
            {damaged > 0 ? ` · Damaged ${damaged}` : ''} / {carton.productCount}
            {pending > 0 ? (
              <span className="ml-2 font-normal text-slate-500">({pending} left in carton)</span>
            ) : null}
            {bagLabel ? (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-200">
                {bagLabel}
              </span>
            ) : null}
          </span>
          <div className="flex items-center gap-2">
            <CartonStatusBadge status={carton.status} />
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onClick={closeCarton}
            >
              Done with carton
            </button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div className="mb-4">
          <ScanFeedbackCard tone={feedback.tone} title={feedback.title} detail={feedback.detail} />
        </div>
      ) : null}

      {step === 'scan_carton' ? (
        <div className="surface-card mb-6 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">1. Scan carton</p>
          <ScanInput
            placeholder="Scan received carton barcode…"
            onScan={async (barcode) => {
              try {
                const cartonCode = await inboundService.requireCartonScan(barcode)
                const opened = await openMut.mutateAsync({ barcode: cartonCode, unpackerId })
                setCarton(opened)
                setBagLabel('')
                setStep('scan_bag')
                setFeedback({
                  tone: 'success',
                  title: `${opened.id} opened`,
                  detail: `Scan bag / trolley label first (${opened.products.length} products in carton)`,
                })
              } catch (e) {
                setFeedback({
                  tone: 'error',
                  title: 'Could not open carton',
                  detail: e instanceof Error ? e.message : 'Scan failed',
                })
                throw e
              }
            }}
          />
        </div>
      ) : null}

      {step === 'scan_bag' && carton ? (
        <div className="surface-card mb-6 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">2. Scan bag / trolley label</p>
          <p className="mb-3 text-xs text-slate-500">
            Required before any product scans. Use bag label:{' '}
            <span className="font-mono font-semibold text-slate-800">NHHG23638838</span>.
          </p>
          <ScanInput
            placeholder="Scan bag / trolley ID then Enter…"
            onScan={async (label) => {
              try {
                const cleaned = await inboundService.requireBagScan(label)
                setBagLabel(cleaned)
                setStep('scan_products')
                setFeedback({
                  tone: 'success',
                  title: `Using ${cleaned}`,
                  detail: 'Now scan each product into this bag / trolley',
                })
              } catch (e) {
                setFeedback({
                  tone: 'error',
                  title: 'Bag scan failed',
                  detail: e instanceof Error ? e.message : 'Invalid bag',
                })
                throw e
              }
            }}
          />
        </div>
      ) : null}

      {step === 'scan_products' && carton ? (
        <div className="surface-card mb-6 space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">3. Scan products</p>
            <button
              type="button"
              className="cursor-pointer text-xs font-semibold text-slate-500 hover:underline"
              onClick={() => {
                setBagLabel('')
                setStep('scan_bag')
                setProductMode('stage')
                setFeedback({
                  tone: 'warn',
                  title: 'Change bag / trolley',
                  detail: 'Scan a new bag label, then continue products',
                })
              }}
            >
              Change bag
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProductMode('stage')}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold',
                productMode === 'stage'
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700'
              )}
            >
              Good → bag {bagLabel ? `(${bagLabel})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setProductMode('damage')}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold',
                productMode === 'damage'
                  ? 'bg-rose-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700'
              )}
            >
              Damaged → inspection
            </button>
          </div>

          {productMode === 'stage' ? (
            <p className="text-xs text-slate-500">
              Scan good products into bag / trolley <strong>{bagLabel}</strong>.
            </p>
          ) : (
            <p className="text-xs text-rose-700">
              Scan damaged products — they go to the Inspection zone (not binracks).
            </p>
          )}

          <ScanInput
            placeholder={
              productMode === 'damage'
                ? 'Scan damaged product barcode…'
                : 'Scan product barcode into bag…'
            }
            onScan={async (rawScan) => {
              if (productMode === 'stage' && !bagLabel.trim()) {
                setStep('scan_bag')
                setFeedback({
                  tone: 'error',
                  title: 'Bag label required',
                  detail: 'Scan bag / trolley first',
                })
                throw new Error('Bag label required')
              }
              try {
                const productCode = await inboundService.requireProductScan(rawScan)
                const result =
                  productMode === 'damage'
                    ? await damageMut.mutateAsync({
                        rawScan: productCode,
                        cartonId: carton.id,
                        unpackerId,
                      })
                    : await stageMut.mutateAsync({
                        rawScan: productCode,
                        cartonId: carton.id,
                        containerLabel: bagLabel,
                        unpackerId,
                      })
                const updated: MasterCarton = {
                  ...carton,
                  status: 'UNPACK_IN_PROGRESS',
                  products: carton.products.map((p) =>
                    p.id === result.product.id ? result.product : p
                  ),
                }
                setCarton(updated)
                const left = updated.products.filter((p) => p.status === 'PENDING').length
                setFeedback({
                  tone: productMode === 'damage' ? 'warn' : 'success',
                  title:
                    productMode === 'damage'
                      ? `${result.product.sku} → inspection`
                      : `${result.product.sku} → ${bagLabel}`,
                  detail: left
                    ? `${left} left in carton`
                    : 'All products from this carton are processed',
                })
                if (left === 0) {
                  setTimeout(() => closeCarton(), 800)
                }
              } catch (e) {
                setFeedback({
                  tone: 'error',
                  title: 'Scan failed',
                  detail: e instanceof Error ? e.message : 'Could not process product',
                })
                throw e
              }
            }}
          />
        </div>
      ) : null}

      {carton ? (
        <div className="mb-6">
          <CartonExpandList
            cartons={[carton]}
            title={`Open carton · click to show products`}
            brandName={brandName}
          />
        </div>
      ) : null}

      {cartonsQ.isLoading ? <LoadingPanel label="Loading…" /> : null}
      <CartonExpandList
        cartons={cartonsQ.data ?? []}
        title="Received cartons ready to unpack"
        emptyLabel="No cartons waiting."
        brandName={brandName}
      />
    </div>
  )
}
