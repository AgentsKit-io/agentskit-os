import {
  forwardRef,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react'
import { cn } from '../lib/cn'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }>
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  delayMs?: number
}

export interface TooltipTriggerProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'content'> {
  content: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delayMs?: number
}

const sideClasses: Record<NonNullable<TooltipProps['side']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export const Tooltip = forwardRef<HTMLSpanElement, TooltipTriggerProps>(
  ({ content, children, className, side = 'top', delayMs = 300, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const tooltipId = useId()

    const show = useCallback(() => {
      timerRef.current = setTimeout(() => setVisible(true), delayMs)
    }, [delayMs])

    const hide = useCallback(() => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      setVisible(false)
    }, [])

    return (
      <span
        ref={ref}
        className={cn('relative inline-flex', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        {...props}
      >
        {children}
        {visible && (
          <span
            role="tooltip"
            id={tooltipId}
            className={cn(
              'pointer-events-none absolute z-50 rounded-md border border-[var(--ag-line)]',
              'bg-[var(--ag-panel)] px-2.5 py-1.5 text-xs text-[var(--ag-ink)]',
              'shadow-lg whitespace-nowrap',
              sideClasses[side],
            )}
          >
            {content}
          </span>
        )}
      </span>
    )
  },
)
Tooltip.displayName = 'Tooltip'
