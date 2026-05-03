import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ className, ...props }, ref) => (
    <kbd
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded border border-[var(--ag-line)]',
        'bg-[var(--ag-panel)] px-1.5 py-0.5 font-mono text-[0.7rem] font-medium',
        'text-[var(--ag-ink-muted)] shadow-sm',
        className,
      )}
      {...props}
    />
  ),
)
Kbd.displayName = 'Kbd'
