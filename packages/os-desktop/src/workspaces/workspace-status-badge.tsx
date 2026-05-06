/**
 * WorkspaceStatusBadge — colored dot indicating workspace operational status.
 *
 * Colors:
 *   running → cyan
 *   idle    → accent
 *   error   → red
 *   paused  → amber
 */

import type { WorkspaceStatus } from './types'

const STATUS_CLASSES: Record<WorkspaceStatus, string> = {
  running: 'bg-[var(--ag-accent)]',
  idle: 'bg-[var(--ag-accent)]',
  error: 'bg-[var(--ag-danger)]',
  paused: 'bg-[var(--ag-warn)]',
}

const STATUS_LABELS: Record<WorkspaceStatus, string> = {
  running: 'Running',
  idle: 'Idle',
  error: 'Error',
  paused: 'Paused',
}

export type WorkspaceStatusBadgeProps = {
  status: WorkspaceStatus
  /** Override the default size class. Defaults to `h-2 w-2`. */
  className?: string
}

export function WorkspaceStatusBadge({ status, className }: WorkspaceStatusBadgeProps) {
  return (
    <span
      role="img"
      aria-label={`Status: ${STATUS_LABELS[status]}`}
      className={[
        'inline-block shrink-0 rounded-full',
        'h-2 w-2',
        STATUS_CLASSES[status],
        className ?? '',
      ]
        .join(' ')
        .trim()}
      data-testid="workspace-status-badge"
      data-status={status}
    />
  )
}
