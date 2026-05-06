/**
 * MultiMonitorPanel — modal that lets the user open Dashboard or Traces on a
 * specific connected monitor, or restore the last persisted layout.
 *
 * D-12 / Issue #46.
 */

import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { GlassPanel } from '@agentskit/os-ui'
import { useMonitors } from './use-monitors'
import { useWindowLayouts } from './use-window-layouts'
import type { MonitorInfo } from './types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type MultiMonitorPanelProps = {
  readonly isOpen: boolean
  readonly onClose: () => void
}

// ---------------------------------------------------------------------------
// Inner component rendered per monitor
// ---------------------------------------------------------------------------

type MonitorCardProps = {
  readonly monitor: MonitorInfo
  readonly onOpen: (purpose: string, monitorId: string) => void
}

function MonitorCard({ monitor, onOpen }: MonitorCardProps): React.JSX.Element {
  return (
    <div
      data-testid={`monitor-card-${monitor.id}`}
      className="rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] p-4 space-y-3"
    >
      {/* Monitor label */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded bg-[var(--ag-accent)]/15 text-[12px] text-[var(--ag-accent)]"
        >
          ▤
        </span>
        <div>
          <p className="text-[13px] font-medium text-[var(--ag-ink)]">{monitor.name}</p>
          <p className="text-[11px] text-[var(--ag-ink-subtle)]">
            {monitor.width} × {monitor.height} · {monitor.scaleFactor}× DPR
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid={`open-dashboard-${monitor.id}`}
          onClick={() => onOpen('dashboard', monitor.id)}
          className={[
            'flex-1 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-1.5',
            'text-[12px] text-[var(--ag-ink)] transition-colors',
            'hover:border-[var(--ag-ink-subtle)] hover:text-[var(--ag-ink)]',
          ].join(' ')}
        >
          Open dashboard here
        </button>
        <button
          type="button"
          data-testid={`open-traces-${monitor.id}`}
          onClick={() => onOpen('traces', monitor.id)}
          className={[
            'flex-1 rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-3 py-1.5',
            'text-[12px] text-[var(--ag-ink)] transition-colors',
            'hover:border-[var(--ag-ink-subtle)] hover:text-[var(--ag-ink)]',
          ].join(' ')}
        >
          Open traces here
        </button>
      </div>
    </div>
  )
}

function MonitorsSection({
  loading,
  monitors,
  onOpen,
}: {
  readonly loading: boolean
  readonly monitors: readonly MonitorInfo[]
  readonly onOpen: (purpose: string, monitorId: string) => void
}): React.JSX.Element {
  if (loading) {
    return (
      <p className="text-[13px] text-[var(--ag-ink-subtle)]" role="status">
        Detecting connected displays…
      </p>
    )
  }
  if (monitors.length === 0) {
    return <p className="text-[13px] text-[var(--ag-ink-subtle)]">No monitors detected.</p>
  }
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[var(--ag-ink-subtle)]">
        {monitors.length} display{monitors.length > 1 ? 's' : ''} detected. Click a button to open a window on that
        display.
      </p>
      {monitors.map((monitor) => (
        <MonitorCard key={monitor.id} monitor={monitor} onOpen={onOpen} />
      ))}
    </div>
  )
}

function RestoreLayoutSection({
  hasDashboardLayout,
  hasTracesLayout,
  onRestore,
}: {
  readonly hasDashboardLayout: boolean
  readonly hasTracesLayout: boolean
  readonly onRestore: (purpose: string) => void
}): React.JSX.Element | null {
  if (!hasDashboardLayout && !hasTracesLayout) return null
  return (
    <div className="border-t border-[var(--ag-line)] pt-4">
      <p className="mb-2 text-[12px] font-medium text-[var(--ag-ink)]">Restore last layout</p>
      <div className="flex gap-2">
        {hasDashboardLayout && (
          <button
            type="button"
            data-testid="restore-dashboard"
            onClick={() => onRestore('dashboard')}
            className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 py-1.5 text-[12px] text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-ink-subtle)]"
          >
            Restore dashboard
          </button>
        )}
        {hasTracesLayout && (
          <button
            type="button"
            data-testid="restore-traces"
            onClick={() => onRestore('traces')}
            className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 py-1.5 text-[12px] text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-ink-subtle)]"
          >
            Restore traces
          </button>
        )}
      </div>
    </div>
  )
}

function NewWindowSection({
  monitors,
  onOpen,
}: {
  readonly monitors: readonly MonitorInfo[]
  readonly onOpen: (purpose: string, monitorId: string) => void
}): React.JSX.Element {
  return (
    <div className="border-t border-[var(--ag-line)] pt-4">
      <p className="mb-2 text-[12px] font-medium text-[var(--ag-ink)]">New window</p>
      <button
        type="button"
        data-testid="open-trace-new-window"
        onClick={() => onOpen('traces', monitors[0]?.id ?? '0')}
        className="rounded-md bg-[var(--ag-accent)] px-4 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
      >
        Open trace on a new window
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function MultiMonitorPanel({ isOpen, onClose }: MultiMonitorPanelProps): React.JSX.Element | null {
  const { monitors, loading } = useMonitors()
  const { getLayout } = useWindowLayouts()
  const [openError, setOpenError] = useState<string | null>(null)

  if (!isOpen) return null

  const reportOpenError = (prefix: string, err: unknown): void => {
    const msg = err instanceof Error ? err.message : String(err)
    setOpenError(`${prefix}: ${msg}`)
  }

  const openWindow = (args: { purpose: string; monitorId: string; errorPrefix: string }): void => {
    setOpenError(null)
    invoke('open_window', { args: { purpose: args.purpose, monitorId: args.monitorId } }).catch((err: unknown) => {
      reportOpenError(args.errorPrefix, err)
    })
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleOpen(purpose: string, monitorId: string): void {
    openWindow({ purpose, monitorId, errorPrefix: 'Could not open window' })
  }

  function handleRestore(purpose: string): void {
    const layout = getLayout(purpose)
    if (!layout) return
    openWindow({ purpose, monitorId: layout.monitorId, errorPrefix: 'Could not restore window' })
  }

  const hasDashboardLayout = getLayout('dashboard') !== undefined
  const hasTracesLayout = getLayout('traces') !== undefined

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        data-testid="multi-monitor-backdrop"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Multi-monitor layout"
        aria-modal="true"
        data-testid="multi-monitor-panel"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <GlassPanel className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--ag-ink)]">Multi-monitor layout</h2>
            <button
              type="button"
              aria-label="Close multi-monitor panel"
              data-testid="close-multi-monitor"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-5 py-5">
            <MonitorsSection loading={loading} monitors={monitors} onOpen={handleOpen} />
            <RestoreLayoutSection
              hasDashboardLayout={hasDashboardLayout}
              hasTracesLayout={hasTracesLayout}
              onRestore={handleRestore}
            />
            <NewWindowSection monitors={monitors} onOpen={handleOpen} />

            {/* Error feedback */}
            {openError !== null && (
              <p
                role="alert"
                data-testid="multi-monitor-error"
                className="text-[12px] text-[var(--ag-danger)]"
              >
                {openError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-[var(--ag-line)] px-5 py-3">
            <button
              type="button"
              data-testid="multi-monitor-close-footer"
              onClick={onClose}
              className="rounded-md border border-[var(--ag-line)] px-4 py-1.5 text-sm text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
            >
              Close
            </button>
          </div>
        </GlassPanel>
      </div>
    </>
  )
}
