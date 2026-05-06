/**
 * NotificationPanel - slide-in panel from the right.
 *
 * Fixed position, full viewport height, 24rem wide (w-96).
 * Groups notifications by severity: error > warning > info > success.
 * Uses GlassPanel from os-ui as the container.
 */

import { useMemo } from 'react'
import { Button, GlassPanel } from '@agentskit/os-ui'
import { X } from 'lucide-react'
import { useNotifications } from './notifications-provider'
import { NotificationItem } from './notification-item'
import type { NotificationSeverity } from './types'

const SEVERITY_ORDER: NotificationSeverity[] = ['error', 'warning', 'info', 'success']

const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  error: 'Errors',
  warning: 'Warnings',
  info: 'Info',
  success: 'Success',
}

const PANEL_CLASSNAME =
  'fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col overflow-hidden rounded-none rounded-t-xl border-b-0 shadow-2xl sm:inset-x-auto sm:right-0 sm:top-0 sm:h-screen sm:max-h-none sm:w-96 sm:rounded-l-xl sm:rounded-tr-none sm:border-r-0'

export function NotificationPanel() {
  const { items, unread, isOpen, close, markRead, clear } = useNotifications()

  // Group by severity
  const groups = useMemo(() => {
    const map = new Map<NotificationSeverity, typeof items>()
    for (const item of items) {
      const existing = map.get(item.severity) ?? []
      map.set(item.severity, [...existing, item])
    }
    return SEVERITY_ORDER.flatMap((sev) => {
      const group = map.get(sev)
      if (!group || group.length === 0) return []
      return [{ severity: sev, notifications: group }]
    })
  }, [items])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop: click outside closes panel. */}
      <div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/60"
        onClick={close}
      />

      {/* Panel */}
      <GlassPanel
        role="dialog"
        aria-modal="true"
        aria-label="Notification center"
        blur="lg"
        data-testid="notification-panel"
        className={PANEL_CLASSNAME}
        style={{ background: 'var(--ag-glass-strong-bg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-[var(--ag-ink)]">Notifications</h2>
            {unread > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--ag-accent)] px-1.5 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clear}
                className="h-6 px-2 text-[11px] text-[var(--ag-ink-muted)]"
                data-testid="clear-notifications"
              >
                Clear all
              </Button>
            )}
            <button
              type="button"
              aria-label="Close notification panel"
              onClick={close}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
              data-testid="close-panel"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-[13px] text-[var(--ag-ink-subtle)]">No notifications</p>
            </div>
          ) : (
            <div role="list" aria-label="Notifications">
              {groups.map(({ severity, notifications }) => (
                <div key={severity} className="mb-3">
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
                    {SEVERITY_LABEL[severity]}
                  </p>
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={markRead}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassPanel>
    </>
  )
}
