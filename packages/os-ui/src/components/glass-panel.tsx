import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg'
}

const blurClasses: Record<NonNullable<GlassPanelProps['blur']>, string> = {
  sm: '[backdrop-filter:saturate(180%)_blur(8px)] [-webkit-backdrop-filter:saturate(180%)_blur(8px)]',
  md: '[backdrop-filter:saturate(180%)_blur(18px)] [-webkit-backdrop-filter:saturate(180%)_blur(18px)]',
  lg: '[backdrop-filter:saturate(180%)_blur(32px)] [-webkit-backdrop-filter:saturate(180%)_blur(32px)]',
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, blur = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-[var(--ag-line)] text-[var(--ag-ink)]',
        'bg-[rgba(8,9,12,0.65)]',
        blurClasses[blur],
        className,
      )}
      {...props}
    />
  ),
)
GlassPanel.displayName = 'GlassPanel'
