import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg'
}

const blurClasses: Record<NonNullable<GlassPanelProps['blur']>, string> = {
  sm: '[backdrop-filter:saturate(160%)_blur(12px)] [-webkit-backdrop-filter:saturate(160%)_blur(12px)]',
  md: '[backdrop-filter:var(--ag-glass-blur)] [-webkit-backdrop-filter:var(--ag-glass-blur)]',
  lg: '[backdrop-filter:saturate(180%)_blur(28px)] [-webkit-backdrop-filter:saturate(180%)_blur(28px)]',
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, blur = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-[var(--ag-glass-border)] text-[var(--ag-ink)] shadow-[var(--ag-glass-shadow)]',
        'bg-[var(--ag-glass-bg)]',
        blurClasses[blur],
        className,
      )}
      {...props}
    />
  ),
)
GlassPanel.displayName = 'GlassPanel'
