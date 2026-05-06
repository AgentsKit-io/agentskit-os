/**
 * WidgetPicker - modal listing widget kinds in three sections:
 *   1. Built-in - static built-in widget kinds
 *   2. Custom - user-created custom widget kinds (future)
 *   3. Plugin widgets - widgets contributed by plugins, with source-plugin pill
 *
 * Plugin widget kinds follow the `plugin:<pluginId>:<widgetId>` convention.
 *
 * Part of M2 #248 — plugin-contributed dashboards + widgets extension point.
 *
 * Props:
 *   isOpen - controls visibility
 *   onClose - called when closed without adding
 *   onAdd - called with the chosen widget kind
 */

import { useCallback, useEffect, useRef } from 'react'
import { BUILT_IN_WIDGETS } from './widget-registry'
import { Button } from '@agentskit/os-ui'
import { X } from 'lucide-react'
import { usePluginContributions } from '../plugins/plugin-contributions-provider'

type Props = {
  isOpen: boolean
  onClose: () => void
  onAdd: (kind: string) => void
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
      {children}
    </p>
  )
}

function SourcePill({ pluginId }: { pluginId: string }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-[var(--ag-accent)]/40 bg-[var(--ag-accent-dim)] px-2 py-0.5 text-[10px] font-medium text-[var(--ag-accent)]">
      {pluginId}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function WidgetPicker({ isOpen, onClose, onAdd }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { widgets: pluginWidgets } = usePluginContributions()

  // Sync native dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  // Close on backdrop click (native dialog fires 'cancel' on Escape too)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    function onCancel(e: Event) {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  const handleAdd = useCallback(
    (kind: string) => {
      onAdd(kind)
      onClose()
    },
    [onAdd, onClose],
  )

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      data-testid="widget-picker"
      aria-label="Add widget"
      aria-modal="true"
      className="m-auto max-h-[82vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] p-0 shadow-xl backdrop:bg-black/40 [backdrop-filter:var(--ag-glass-blur)]"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-[var(--ag-line)] bg-[var(--ag-glass-strong-bg)] px-5 py-4 [backdrop-filter:var(--ag-glass-blur)]">
        <h2 className="text-base font-semibold text-[var(--ag-ink)]">Add widget</h2>
        <button
          type="button"
          aria-label="Close widget picker"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {/* Built-in section */}
      <div>
        <SectionLabel>Built-in</SectionLabel>
        <ul role="list" className="flex flex-col divide-y divide-[var(--ag-line)]">
          {BUILT_IN_WIDGETS.map((entry) => (
            <li
              key={entry.kind}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--ag-ink)]">{entry.label}</p>
                <p className="mt-0.5 text-xs text-[var(--ag-ink-subtle)]">
                  Default size: {entry.defaultSize[0]} x {entry.defaultSize[1]}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                data-testid={`add-widget-${entry.kind}`}
                onClick={() => handleAdd(entry.kind)}
              >
                Add
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* Custom section — placeholder for future user-created widgets */}
      <div className="border-t border-[var(--ag-line)]">
        <SectionLabel>Custom</SectionLabel>
        <p className="px-5 pb-4 text-xs text-[var(--ag-ink-subtle)]">
          Custom widgets coming soon.
        </p>
      </div>

      {/* Plugin widgets section */}
      {pluginWidgets.length > 0 && (
        <div className="border-t border-[var(--ag-line)]">
          <SectionLabel>Plugin widgets</SectionLabel>
          <ul role="list" className="flex flex-col divide-y divide-[var(--ag-line)]">
            {pluginWidgets.map((pw) => (
              <li
                key={pw.kind}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="flex items-center text-sm font-medium text-[var(--ag-ink)]">
                    {pw.label}
                    <SourcePill pluginId={pw.pluginId} />
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ag-ink-subtle)]">
                    Default size: {pw.defaultSize[0]} x {pw.defaultSize[1]}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`add-plugin-widget-${pw.kind}`}
                  onClick={() => handleAdd(pw.kind)}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </dialog>
  )
}
