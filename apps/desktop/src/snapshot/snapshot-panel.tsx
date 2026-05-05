/**
 * SnapshotPanel — modal for exporting and importing desktop state snapshots.
 *
 * Export: serialises the current localStorage state to a JSON file download.
 * Import: lets the user pick a JSON file, validates and applies it, then
 *         reloads the window so all React contexts re-hydrate from fresh data.
 *
 * D-13 / Issue #47 — snapshot & restore desktop state.
 */

import { useRef, useState } from 'react'
import { GlassPanel } from '@agentskit/os-ui'
import { captureSnapshot, exportSnapshotJson, importSnapshotJson, applySnapshot } from './snapshot-store'
import { nowIso } from '../lib/date'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type SnapshotPanelProps = {
  readonly isOpen: boolean
  readonly onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SnapshotPanel({ isOpen, onClose }: SnapshotPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  if (!isOpen) return null

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleExport() {
    const snap = captureSnapshot()
    const json = exportSnapshotJson(snap)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agentskitos-snapshot-${nowIso().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    setImportError(null)
    setImportSuccess(false)
    fileInputRef.current?.click()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text !== 'string') {
        setImportError('Could not read the selected file.')
        return
      }
      try {
        const snap = importSnapshotJson(text)
        applySnapshot(snap)
        setImportSuccess(true)
        // Give the user a moment to see the success state, then reload.
        setTimeout(() => {
          window.location.reload()
        }, 800)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setImportError(`Invalid snapshot file: ${message}`)
      }
    }
    reader.onerror = () => {
      setImportError('Failed to read the file.')
    }
    reader.readAsText(file)

    // Reset input so the same file can be re-selected if needed.
    event.target.value = ''
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        data-testid="snapshot-backdrop"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Desktop Snapshot"
        aria-modal="true"
        data-testid="snapshot-panel"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <GlassPanel className="flex w-full max-w-md flex-col overflow-hidden rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--ag-ink)]">Desktop Snapshot</h2>
            <button
              type="button"
              aria-label="Close snapshot panel"
              data-testid="close-snapshot"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 px-5 py-5">
            <p className="text-[13px] text-[var(--ag-ink-subtle)]">
              A snapshot bundles all persisted desktop state (preferences, shortcuts, theme, status
              line, notifications, focus mode, onboarding, and workspace selection) into a single
              JSON file. Export it to back up your configuration or share it across machines.
              Importing a snapshot re-applies all stored values and reloads the app.
            </p>

            {/* Export */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-[var(--ag-ink)]">Export</h3>
              <button
                type="button"
                data-testid="export-snapshot"
                onClick={handleExport}
                className="w-full rounded-md bg-[var(--ag-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Export desktop snapshot
              </button>
            </div>

            {/* Import */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-[var(--ag-ink)]">Import</h3>
              <button
                type="button"
                data-testid="import-snapshot"
                onClick={handleImportClick}
                className="w-full rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-2 text-sm text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-ink-subtle)]"
              >
                Import snapshot from file…
              </button>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                data-testid="snapshot-file-input"
                className="sr-only"
                onChange={handleFileChange}
                aria-label="Select snapshot JSON file"
              />
              {importError && (
                <p
                  role="alert"
                  data-testid="import-error"
                  className="text-[12px] text-[var(--ag-danger)]"
                >
                  {importError}
                </p>
              )}
              {importSuccess && (
                <p
                  role="status"
                  data-testid="import-success"
                  className="text-[12px] text-[var(--ag-success)]"
                >
                  Snapshot applied — reloading…
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-[var(--ag-line)] px-5 py-3">
            <button
              type="button"
              data-testid="snapshot-close-footer"
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
