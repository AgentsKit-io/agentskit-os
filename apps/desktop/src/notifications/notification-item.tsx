/**
 * NotificationItem — single notification row.
 *
 * Displays a severity icon, title, optional message, relative timestamp,
 * and an optional action button. Clicking the row marks it as read.
 */

import { Button } from '@agentskit/os-ui'
import type { Notification, NotificationSeverity } from './types'

// ---------------------------------------------------------------------------
// Severity icon
// ---------------------------------------------------------------------------

const SEVERITY_ICON: Record<NotificationSeverity, string> = {
  info: 'i',
  warning: '!',
  error: 'x',
  success: 'ok',
}

const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  info: 'text-[var(--ag-accent)]',
  warning: 'text-[var(--ag-warning)]',
  error: 'text-[var(--ag-danger)]',
  success: 'text-[var(--ag-success)]',
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then

  if (diffMs < 0) return 'just now'
  if (diffMs < 60_000) return 'just now'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  return `${Math.floor(diffMs / 86_400_000)}d ago`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type NotificationItemProps = {
  notification: Notification
  onMarkRead: (id: string) => void
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const { id, severity, title, message, timestamp, read, action } = notification

  return (
    <div
      role="listitem"
      data-testid="notification-item"
      onClick={() => {
        if (!read) onMarkRead(id)
      }}
      className={[
        'group flex cursor-default items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
        read
          ? 'opacity-60'
          : 'bg-[var(--ag-panel-alt)]/40 hover:bg-[var(--ag-panel-alt)]/70',
      ].join(' ')}
    >
      {/* Severity icon */}
      <span
        aria-hidden
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase',
          SEVERITY_COLOR[severity],
        ].join(' ')}
      >
        {SEVERITY_ICON[severity]}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13px] font-medium text-[var(--ag-ink)]">{title}</p>
          <time
            dateTime={timestamp}
            className="shrink-0 text-[11px] text-[var(--ag-ink-subtle)]"
          >
            {formatRelativeTime(timestamp)}
          </time>
        </div>

        {message && (
          <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--ag-ink-muted)]">
            {message}
          </p>
        )}

        {action && (
          <div className="mt-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                action.run()
              }}
              className="h-6 px-2 text-[11px]"
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>

      {/* Unread dot */}
      {!read && (
        <span
          aria-label="Unread"
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ag-accent)]"
        />
      )}
    </div>
  )
}
