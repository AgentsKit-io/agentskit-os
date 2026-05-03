/**
 * TelemetryTab — anonymous telemetry opt-in and self-export controls.
 */

import type { Preferences } from '../preferences-types'

type TelemetryTabProps = {
  readonly prefs: Preferences
  readonly onChange: (partial: Partial<Preferences>) => void
  readonly onExport: () => void
}

export function TelemetryTab({ prefs, onChange, onExport }: TelemetryTabProps) {
  return (
    <div className="space-y-4">
      {/* Opt-in toggle */}
      <div className="rounded-lg border border-[var(--ag-line)] px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--ag-ink)]">
              Anonymous Usage Telemetry
            </p>
            <p className="mt-1 text-[12px] text-[var(--ag-ink-subtle)]">
              Send anonymous crash reports and feature-usage statistics to help improve
              AgentsKitOS. No personally identifiable information is collected. You can
              export your local data at any time below.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            id="prefs-telemetry-opt-in"
            data-testid="toggle-telemetry"
            aria-checked={prefs.telemetryOptIn}
            onClick={() => onChange({ telemetryOptIn: !prefs.telemetryOptIn })}
            className={[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ag-accent)] focus:ring-offset-2',
              prefs.telemetryOptIn ? 'bg-[var(--ag-accent)]' : 'bg-[var(--ag-line)]',
            ].join(' ')}
          >
            <span
              aria-hidden
              className={[
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                prefs.telemetryOptIn ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>
        {prefs.telemetryOptIn && (
          <p
            data-testid="telemetry-active-note"
            className="mt-3 text-[11px] text-[var(--ag-accent)]"
          >
            Telemetry is active. Thank you for helping improve AgentsKitOS.
          </p>
        )}
      </div>

      {/* Data export */}
      <div className="rounded-lg border border-[var(--ag-line)] px-4 py-3">
        <p className="mb-1 text-sm font-medium text-[var(--ag-ink)]">Export My Data</p>
        <p className="mb-3 text-[12px] text-[var(--ag-ink-subtle)]">
          Download a JSON copy of your stored preferences. No telemetry payload is
          included — only your local configuration.
        </p>
        <button
          type="button"
          data-testid="export-data-btn"
          onClick={onExport}
          className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 py-1.5 text-sm text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-ink-subtle)] hover:text-[var(--ag-ink)]"
        >
          Export preferences.json
        </button>
      </div>
    </div>
  )
}
