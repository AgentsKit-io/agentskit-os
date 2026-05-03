import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: [
          'bg-[var(--ag-panel-alt)] text-[var(--ag-ink)]',
          'border border-[var(--ag-line)]',
        ].join(' '),
        outline: [
          'bg-transparent text-[var(--ag-ink)]',
          'border border-[var(--ag-line)]',
        ].join(' '),
        accent: [
          'bg-[var(--ag-accent-dim)] text-[var(--ag-accent-hover)]',
          'border border-transparent',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>['variant']
>

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
)
Badge.displayName = 'Badge'

export { badgeVariants }
