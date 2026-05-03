/**
 * NotificationBell — sidebar header button showing the unread count badge.
 *
 * Renders a bell icon button. When there are unread notifications, a small
 * red badge is overlaid showing the count (capped at 99+).
 */

import { useNotifications } from './notifications-provider'

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function NotificationBell() {
  const { unread, isOpen, open, close } = useNotifications()

  const badgeCount = unread > 99 ? '99+' : String(unread)

  return (
    <button
      type="button"
      aria-label={
        unread === 0
          ? 'Notifications'
          : `Notifications — ${unread} unread`
      }
      aria-pressed={isOpen}
      onClick={() => (isOpen ? close() : open())}
      className="relative flex h-6 w-6 items-center justify-center rounded text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
      data-testid="notification-bell"
    >
      <BellIcon />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white"
          data-testid="notification-badge"
        >
          {badgeCount}
        </span>
      )}
    </button>
  )
}
