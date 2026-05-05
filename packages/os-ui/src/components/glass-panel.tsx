import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg'
}

const blurClasses: Record<NonNullable<GlassPanelProps['blur']>, string> = {
  sm: '[backdrop-filter:saturate(140%)_blur(4px)] [-webkit-backdrop-filter:saturate(140%)_blur(4px)]',
  md: '[backdrop-filter:saturate(140%)_blur(8px)] [-webkit-backdrop-filter:saturate(140%)_blur(8px)]',
  lg: '[backdrop-filter:saturate(140%)_blur(12px)] [-webkit-backdrop-filter:saturate(140%)_blur(12px)]',
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, blur = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-[var(--ag-line)] text-[var(--ag-ink)]',
        'bg-[var(--ag-panel)]',
        blurClasses[blur],
        className,
      )}
      {...props}
    />
  ),
)
GlassPanel.displayName = 'GlassPanel'
