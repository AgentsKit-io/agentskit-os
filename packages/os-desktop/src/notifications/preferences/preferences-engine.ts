/**
 * preferences-engine — pure routing decision function.
 *
 * routeNotification(notification, prefs, now)
 *   1. If quiet hours are enabled and the current time falls within the quiet
 *      window AND (the event is not critical OR allowCritical is false),
 *      return 'silent'.
 *   2. Otherwise, look up the most-specific matching key in
 *      prefs.routing, falling back to 'panel'.
 *
 * Matching order (most-specific wins):
 *   exact key   → e.g. "flow.run.completed"
 *   prefix key  → e.g. "error.*" for "error.network"
 *   fallback    → 'panel'
 *
 * "Critical" events are those whose type starts with "error." or
 * "audit.flagged." — they bypass quiet hours when allowCritical is true.
 */

import type { NotificationPreferences, NotificationRouting } from './preferences-types'

// ---------------------------------------------------------------------------
// Minimal notification shape needed by the engine
// ---------------------------------------------------------------------------

export type RoutableNotification = {
  /** Event type string, e.g. "error.network" or "flow.run.completed". */
  readonly eventType: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the event type is considered critical. */
function isCritical(eventType: string): boolean {
  return eventType.startsWith('error.') || eventType.startsWith('audit.flagged.')
}

/**
 * Returns true if the given time (in minutes since midnight) falls within the
 * quiet hours window.
 *
 * Handles wrap-around (e.g. 22:00–08:00 spans midnight).
 */
function isInQuietWindow(
  nowMinute: number,
  startMinute: number,
  endMinute: number,
): boolean {
  if (startMinute === endMinute) {
    // Degenerate: 24-hour window
    return true
  }
  if (startMinute < endMinute) {
    // Same-day window: e.g. 09:00–17:00
    return nowMinute >= startMinute && nowMinute < endMinute
  }
  // Overnight window: e.g. 22:00–08:00
  return nowMinute >= startMinute || nowMinute < endMinute
}

/**
 * Find the most-specific routing key for the given event type.
 *
 * Priority:
 *   1. Exact match (e.g. "flow.run.completed")
 *   2. Longest prefix wildcard match (e.g. "error.*" for "error.network")
 *   3. undefined (caller falls back to 'panel')
 */
function findRouting(
  eventType: string,
  routingMap: Record<string, NotificationRouting>,
): NotificationRouting | undefined {
  // 1. Exact match
  if (eventType in routingMap) {
    return routingMap[eventType]
  }

  // 2. Prefix wildcard match — find all "foo.*" keys whose prefix matches
  let bestMatch: NotificationRouting | undefined
  let bestLength = -1

  for (const [key, value] of Object.entries(routingMap)) {
    if (key.endsWith('.*')) {
      const prefix = key.slice(0, -2) // strip ".*"
      if (eventType.startsWith(prefix + '.') || eventType === prefix) {
        if (prefix.length > bestLength) {
          bestLength = prefix.length
          bestMatch = value
        }
      }
    }
  }

  return bestMatch
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Determine how a notification should be routed.
 *
 * @param notification  The notification to route (only eventType is used).
 * @param prefs         Current NotificationPreferences.
 * @param now           Current Date (defaults to new Date()). Provided
 *                      explicitly to keep the function pure/testable.
 * @returns             The resolved NotificationRouting value.
 */
export function routeNotification(
  notification: RoutableNotification,
  prefs: NotificationPreferences,
  now: Date = new Date(),
): NotificationRouting {
  const { eventType } = notification
  const { quietHours, routing } = prefs

  // Step 1 — quiet hours check
  if (quietHours.enabled) {
    const nowMinute = now.getHours() * 60 + now.getMinutes()
    const inWindow = isInQuietWindow(
      nowMinute,
      quietHours.startMinute,
      quietHours.endMinute,
    )

    if (inWindow) {
      const critical = isCritical(eventType)
      if (!critical || !quietHours.allowCritical) {
        return 'silent'
      }
      // Critical + allowCritical: fall through to normal routing
    }
  }

  // Step 2 — per-event-type routing
  return findRouting(eventType, routing) ?? 'panel'
}
