import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[var(--ag-accent)] focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[var(--ag-surface)]',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--ag-panel-alt)] text-[var(--ag-ink)]',
          'hover:bg-[var(--ag-line)] border border-[var(--ag-line)]',
        ].join(' '),
        accent: [
          'bg-[var(--ag-accent)] text-[var(--ag-surface)]',
          'hover:bg-[var(--ag-accent-hover)]',
        ].join(' '),
        ghost: [
          'bg-transparent text-[var(--ag-ink)]',
          'hover:bg-[var(--ag-panel)]',
        ].join(' '),
        outline: [
          'bg-transparent text-[var(--ag-ink)]',
          'border border-[var(--ag-line)] hover:bg-[var(--ag-panel)]',
        ].join(' '),
        link: [
          'bg-transparent text-[var(--ag-accent)] underline-offset-4',
          'hover:underline',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>['variant']
>
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)

Button.displayName = 'Button'

export { buttonVariants }
