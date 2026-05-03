/**
 * Notification center — shared types.
 *
 * Defines the Notification record, NotificationSeverity union, and the Notify
 * action contract used by useNotifications().
 */

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success'

export type NotificationAction = {
  readonly label: string
  readonly run: () => void
}

export type Notification = {
  /** Unique identifier (UUID v4). */
  readonly id: string
  /** Severity / category used for grouping and icon selection. */
  readonly severity: NotificationSeverity
  /** Short human-readable title. */
  readonly title: string
  /** Optional longer description. */
  readonly message?: string
  /** ISO-8601 timestamp. */
  readonly timestamp: string
  /** Whether the user has seen this notification. */
  readonly read: boolean
  /**
   * Optional call-to-action that appears as a button on the notification row.
   * Clicking it calls `action.run()`.
   */
  readonly action?: NotificationAction
}

/** Shape returned by useNotifications(). */
export type NotificationsContextValue = {
  /** All notifications (newest first). */
  items: Notification[]
  /** Number of unread notifications. */
  unread: number
  /** Add a new notification. `id` and `timestamp` are auto-generated if omitted. */
  push: (n: Notify) => void
  /** Mark a single notification as read. */
  markRead: (id: string) => void
  /** Discard all notifications. */
  clear: () => void
  /** Open the slide-in notification panel. */
  open: () => void
  /** Close the slide-in notification panel. */
  close: () => void
  /** Whether the panel is currently open. */
  isOpen: boolean
}

/** Input shape for push(). id and timestamp are optional — store generates them. */
export type Notify = {
  readonly severity: NotificationSeverity
  readonly title: string
  readonly message?: string
  readonly action?: Notification['action']
}
