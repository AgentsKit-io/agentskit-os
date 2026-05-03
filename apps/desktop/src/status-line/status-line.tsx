/**
 * StatusLine — fixed bottom bar (~24 px tall) with user-configurable segments.
 *
 * Reads the ordered list of visible segment ids from `useStatusLineConfig()`.
 * Builds a `StatusContext` from live data (workspaces, notifications, theme,
 * sidecar status, etc.) and renders each segment left-to-right separated by
 * a subtle divider.
 *
 * The bar is fixed to the bottom of the viewport, sits above all content via
 * z-index, and uses the design-token palette for colours.
 */

import { useEffect, useState } from 'react'
import { useTheme } from '@agentskit/os-ui'
import { useStatusLineConfig } from './status-line-provider'
import { getSegmentById } from './status-segments'
import { useNotifications } from '../notifications/notifications-provider'
import { useWorkspaces } from '../workspaces/workspaces-provider'
import type { StatusContext } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Align to the next whole minute, then tick every 60 s.
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000
    const initial = setTimeout(() => {
      setNow(new Date())
      const interval = setInterval(() => setNow(new Date()), 60_000)
      return () => clearInterval(interval)
    }, msUntilNextMinute)

    return () => clearTimeout(initial)
  }, [])

  return now
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusLine() {
  const { visibleIds } = useStatusLineConfig()
  const { unread } = useNotifications()
  const { current: currentWorkspace } = useWorkspaces()
  const { theme } = useTheme()
  const now = useNow()

  const ctx: StatusContext = {
    workspaceName: currentWorkspace?.name ?? null,
    runMode: 'real',
    sidecarStatus: 'disconnected',
    activeRuns: 0,
    cost24h: 0,
    unreadNotifications: unread,
    theme,
    now,
  }

  if (visibleIds.length === 0) return null

  return (
    <div
      role="status"
      aria-label="Status bar"
      data-testid="status-line"
      className="flex h-6 shrink-0 items-center border-t border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-2 text-[11px] text-[var(--ag-ink-muted)]"
    >
      {visibleIds.map((id, index) => {
        const segment = getSegmentById(id)
        if (!segment) return null
        const content = segment.render(ctx)
        return (
          <span
            key={id}
            data-testid={`status-segment-${id}`}
            className="flex items-center"
          >
            {index > 0 && (
              <span
                aria-hidden
                className="mx-2 h-3 w-px shrink-0 bg-[var(--ag-line)]"
              />
            )}
            {content}
          </span>
        )
      })}
    </div>
  )
}
