/**
 * NotificationPreferencesPanel - modal for per-event routing + quiet hours.
 *
 * Sections:
 *   Routing matrix - event-type rows x routing-mode columns, radio per row.
 *   Quiet hours - toggle, start/end time pickers (24h), allow-critical checkbox.
 *
 * Changes are buffered in local state until Save is clicked.
 * Cancel discards changes; Reset restores defaults.
 */

import { useState, useCallback } from 'react'
import { GlassPanel } from '@agentskit/os-ui'
import { X } from 'lucide-react'
import { useNotificationPreferences } from './notification-preferences-provider'
import {
  KNOWN_EVENT_TYPES,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './preferences-types'
import type {
  NotificationPreferences,
  NotificationRouting,
  QuietHours,
} from './preferences-types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROUTING_MODES: ReadonlyArray<{ value: NotificationRouting; label: string }> = [
  { value: 'panel', label: 'Panel' },
  { value: 'os-toast', label: 'OS Toast' },
  { value: 'desktop-alert', label: 'Desktop Alert' },
  { value: 'silent', label: 'Silent' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert minutes-since-midnight to HH:MM string for <input type="time">. */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Convert HH:MM string to minutes-since-midnight. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  let hours = 0
  let minutes = 0
  if (typeof h === 'number' && Number.isFinite(h)) hours = h
  if (typeof m === 'number' && Number.isFinite(m)) minutes = m
  return hours * 60 + minutes
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type RoutingMatrixProps = {
  routing: Record<string, NotificationRouting>
  onChange: (key: string, value: NotificationRouting) => void
}

function RoutingMatrix({ routing, onChange }: RoutingMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-[13px]"
        aria-label="Notification routing matrix"
        data-testid="routing-matrix"
      >
        <thead>
          <tr>
            <th
              scope="col"
              className="pb-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]"
            >
              Event type
            </th>
            {ROUTING_MODES.map(({ value, label }) => (
              <th
                key={value}
                scope="col"
                className="pb-2 px-2 text-center text-[11px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {KNOWN_EVENT_TYPES.map((eventType) => {
            const current = routing[eventType] ?? 'panel'
            return (
              <tr
                key={eventType}
                className="border-t border-[var(--ag-line)] hover:bg-[var(--ag-panel-alt)]/40"
              >
                <td className="py-2 pr-4 font-mono text-[12px] text-[var(--ag-ink)]">
                  {eventType}
                </td>
                {ROUTING_MODES.map(({ value }) => (
                  <td key={value} className="py-2 px-2 text-center">
                    <input
                      type="radio"
                      name={`routing-${eventType}`}
                      value={value}
                      checked={current === value}
                      onChange={() => onChange(eventType, value)}
                      aria-label={`Route ${eventType} to ${value}`}
                      data-testid={`routing-${eventType}-${value}`}
                      className="accent-[var(--ag-accent)]"
                    />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

type QuietHoursSectionProps = {
  quietHours: QuietHours
  onChange: (patch: Partial<QuietHours>) => void
}

function QuietHoursSection({ quietHours, onChange }: QuietHoursSectionProps) {
  return (
    <div className="space-y-4" data-testid="quiet-hours-section">
      {/* Enable toggle */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={quietHours.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="h-4 w-4 accent-[var(--ag-accent)]"
          data-testid="quiet-hours-enabled"
          aria-label="Enable quiet hours"
        />
        <span className="text-[13px] font-medium text-[var(--ag-ink)]">
          Enable quiet hours
        </span>
      </label>

      {quietHours.enabled && (
        <div className="ml-7 space-y-3">
          {/* Start time */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="quiet-start"
              className="w-20 text-[13px] text-[var(--ag-ink-muted)]"
            >
              Start
            </label>
            <input
              id="quiet-start"
              type="time"
              value={minutesToTime(quietHours.startMinute)}
              onChange={(e) => onChange({ startMinute: timeToMinutes(e.target.value) })}
              className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-2 py-1 text-[13px] text-[var(--ag-ink)]"
              data-testid="quiet-hours-start"
            />
          </div>

          {/* End time */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="quiet-end"
              className="w-20 text-[13px] text-[var(--ag-ink-muted)]"
            >
              End
            </label>
            <input
              id="quiet-end"
              type="time"
              value={minutesToTime(quietHours.endMinute)}
              onChange={(e) => onChange({ endMinute: timeToMinutes(e.target.value) })}
              className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-2 py-1 text-[13px] text-[var(--ag-ink)]"
              data-testid="quiet-hours-end"
            />
          </div>

          {/* Allow critical */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={quietHours.allowCritical}
              onChange={(e) => onChange({ allowCritical: e.target.checked })}
              className="h-4 w-4 accent-[var(--ag-accent)]"
              data-testid="quiet-hours-allow-critical"
              aria-label="Allow critical notifications during quiet hours"
            />
            <span className="text-[13px] text-[var(--ag-ink-muted)]">
              Allow critical notifications (errors, audit flags) during quiet hours
            </span>
          </label>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export type NotificationPreferencesPanelProps = {
  readonly isOpen: boolean
  readonly onClose: () => void
}

export function NotificationPreferencesPanel({
  isOpen,
  onClose,
}: NotificationPreferencesPanelProps) {
  const { prefs, save, reset } = useNotificationPreferences()
  const [draft, setDraft] = useState<NotificationPreferences>(prefs)

  // Sync draft when panel opens
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen && !wasOpen) {
    setWasOpen(true)
    setDraft(prefs)
  } else if (!isOpen && wasOpen) {
    setWasOpen(false)
  }

  const handleRoutingChange = useCallback(
    (eventType: string, value: NotificationRouting) => {
      setDraft((prev) => ({
        ...prev,
        routing: { ...prev.routing, [eventType]: value },
      }))
    },
    [],
  )

  const handleQuietHoursChange = useCallback((patch: Partial<QuietHours>) => {
    setDraft((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, ...patch },
    }))
  }, [])

  const handleSave = useCallback(() => {
    save(draft)
    onClose()
  }, [save, draft, onClose])

  const handleReset = useCallback(() => {
    reset()
    setDraft(DEFAULT_NOTIFICATION_PREFERENCES)
  }, [reset])

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Notification preferences"
        aria-modal="true"
        data-testid="notification-preferences-panel"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <GlassPanel className="flex w-full max-w-3xl flex-col overflow-hidden rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--ag-ink)]">
              Notification preferences
            </h2>
            <button
              type="button"
              aria-label="Close notification preferences"
              data-testid="close-notification-preferences"
              onClick={handleCancel}
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-8">
            {/* Routing matrix */}
            <section aria-labelledby="routing-heading">
              <h3
                id="routing-heading"
                className="mb-3 text-[13px] font-semibold text-[var(--ag-ink)]"
              >
                Per-event routing
              </h3>
              <p className="mb-4 text-[12px] text-[var(--ag-ink-subtle)]">
                Choose where each event type is delivered. &quot;Silent&quot; suppresses
                the notification entirely.
              </p>
              <RoutingMatrix
                routing={draft.routing}
                onChange={handleRoutingChange}
              />
            </section>

            {/* Quiet hours */}
            <section aria-labelledby="quiet-hours-heading">
              <h3
                id="quiet-hours-heading"
                className="mb-3 text-[13px] font-semibold text-[var(--ag-ink)]"
              >
                Quiet hours
              </h3>
              <p className="mb-4 text-[12px] text-[var(--ag-ink-subtle)]">
                During the configured window, non-critical notifications are suppressed.
              </p>
              <QuietHoursSection
                quietHours={draft.quietHours}
                onChange={handleQuietHoursChange}
              />
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--ag-line)] px-5 py-3">
            <button
              type="button"
              data-testid="reset-notification-preferences"
              onClick={handleReset}
              className="text-[13px] text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
            >
              Reset to defaults
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="cancel-notification-preferences"
                onClick={handleCancel}
                className="rounded-md border border-[var(--ag-line)] px-4 py-1.5 text-sm text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="save-notification-preferences"
                onClick={handleSave}
                className="rounded-md bg-[var(--ag-accent)] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </>
  )
}
