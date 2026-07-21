import { cn } from '@/lib/cn'
import type { OnboardedBrand } from '@/types/inventory'

export function BrandTabs({
  brands,
  value,
  onChange,
}: {
  brands: OnboardedBrand[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={cn(
          'rounded-xl px-3 py-2 text-sm font-semibold transition',
          value === 'all'
            ? 'bg-primary-600 text-white'
            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        )}
      >
        All brands
      </button>
      {brands.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onChange(b.id)}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
            value === b.id
              ? 'bg-primary-600 text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          )}
        >
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold',
              value === b.id ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
            )}
          >
            {b.logoInitials}
          </span>
          {b.name}
          {b.status === 'onboarding' ? (
            <span className={cn('text-[10px] uppercase', value === b.id ? 'text-primary-100' : 'text-amber-600')}>
              new
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
