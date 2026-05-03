/**
 * Notification preferences — Zod schemas and TypeScript types.
 *
 * NotificationRouting — where a notification is delivered.
 * EventTypeRoutingMap — per-event-type routing overrides.
 * QuietHours          — time window during which non-critical events are suppressed.
 * NotificationPreferences — top-level persisted shape.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Routing mode
// ---------------------------------------------------------------------------

export const NotificationRoutingSchema = z.enum([
  'panel',
  'os-toast',
  'desktop-alert',
  'silent',
])

export type NotificationRouting = z.infer<typeof NotificationRoutingSchema>

// ---------------------------------------------------------------------------
// Known event-type keys
// ---------------------------------------------------------------------------

/**
 * Canonical event-type patterns understood by the routing engine.
 * Values are used as prefix-match keys: e.g. "error.*" matches any type
 * starting with "error.".
 */
export const KNOWN_EVENT_TYPES = [
  'error.*',
  'audit.flagged.*',
  'flow.run.completed',
  'flow.run.failed',
  'cost.threshold',
  'tool.invoke.denied',
] as const

export type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number]

// ---------------------------------------------------------------------------
// EventTypeRoutingMap
// ---------------------------------------------------------------------------

export const EventTypeRoutingMapSchema = z.record(z.string(), NotificationRoutingSchema)

export type EventTypeRoutingMap = z.infer<typeof EventTypeRoutingMapSchema>

// ---------------------------------------------------------------------------
// QuietHours
// ---------------------------------------------------------------------------

export const QuietHoursSchema = z.object({
  /** Whether quiet hours are active. */
  enabled: z.boolean().default(false),
  /**
   * Start of quiet window, in minutes since midnight (0–1439).
   * Default 22:00 → 22 * 60 = 1320.
   */
  startMinute: z.number().int().min(0).max(1439).default(1320),
  /**
   * End of quiet window, in minutes since midnight (0–1439).
   * Default 08:00 → 8 * 60 = 480.
   */
  endMinute: z.number().int().min(0).max(1439).default(480),
  /**
   * When true, critical notifications (error.*) are always delivered even
   * during quiet hours.
   */
  allowCritical: z.boolean().default(true),
})

export type QuietHours = z.infer<typeof QuietHoursSchema>

// ---------------------------------------------------------------------------
// NotificationPreferences
// ---------------------------------------------------------------------------

const DEFAULT_QUIET_HOURS_VALUE = {
  enabled: false as const,
  startMinute: 1320,
  endMinute: 480,
  allowCritical: true as const,
}

export const NotificationPreferencesSchema = z.object({
  routing: EventTypeRoutingMapSchema.default({}),
  quietHours: QuietHoursSchema.default(DEFAULT_QUIET_HOURS_VALUE),
})

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Default routing: all known event types route to the panel. */
export const DEFAULT_ROUTING: EventTypeRoutingMap = Object.fromEntries(
  KNOWN_EVENT_TYPES.map((key) => [key, 'panel' as NotificationRouting]),
)

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences =
  NotificationPreferencesSchema.parse({
    routing: DEFAULT_ROUTING,
    quietHours: {},
  })
