/**
 * WidgetPicker — modal listing built-in and custom widget kinds.
 *
 * Sections:
 *   - Built-in widgets (always shown)
 *   - Custom widgets (user-defined, from localStorage)
 *     + "New / Edit" button to open the CustomWidgetEditor
 *
 * Props:
 *   isOpen        — controls visibility
 *   onClose       — called when closed without adding
 *   onAdd         — called with the chosen widget kind
 *   onNewCustom   — called when the user wants to create/edit a custom widget
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { BUILT_IN_WIDGETS, kindForCustomWidget } from './widget-registry'
import { loadCustomWidgets } from './custom/custom-widget-store'
import { Button } from '@agentskit/os-ui'
import type { CustomWidget } from './custom/custom-widget-types'

type Props = {
  isOpen: boolean
  onClose: () => void
  onAdd: (kind: string) => void
  /** Opens the custom widget editor; undefined if not supported */
  onNewCustom?: () => void
}

export function WidgetPicker({ isOpen, onClose, onAdd, onNewCustom }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>([])

  // Reload custom widgets whenever the picker opens
  useEffect(() => {
    if (isOpen) {
      setCustomWidgets(loadCustomWidgets())
    }
  }, [isOpen])

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
      className="m-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-[var(--ag-line)] bg-[var(--ag-panel)] px-5 py-4">
        <h2 className="text-base font-semibold text-[var(--ag-ink)]">Add widget</h2>
        <button
          type="button"
          aria-label="Close widget picker"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          ×
        </button>
      </div>

      {/* Built-in widgets */}
      <div className="px-5 pb-1 pt-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Built-in
        </p>
      </div>
      <ul role="list" className="flex flex-col divide-y divide-[var(--ag-line)]">
        {BUILT_IN_WIDGETS.map((entry) => (
          <li
            key={entry.kind}
            className="flex items-center justify-between px-5 py-3"
          >
            <div>
              <p className="text-sm font-medium text-[var(--ag-ink)]">{entry.label}</p>
              <p className="mt-0.5 text-xs text-[var(--ag-ink-subtle)]">
                Default size: {entry.defaultSize[0]}×{entry.defaultSize[1]}
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

      {/* Custom widgets */}
      <div className="border-t border-[var(--ag-line)] px-5 pb-1 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            Custom widgets
          </p>
          {onNewCustom && (
            <Button
              size="sm"
              variant="ghost"
              data-testid="open-custom-widget-editor"
              onClick={onNewCustom}
            >
              + New
            </Button>
          )}
        </div>
      </div>

      {customWidgets.length === 0 ? (
        <div className="px-5 py-4 text-sm text-[var(--ag-ink-subtle)]">
          No custom widgets yet.{' '}
          {onNewCustom ? (
            <button
              type="button"
              className="underline hover:text-[var(--ag-ink)]"
              onClick={onNewCustom}
            >
              Create one
            </button>
          ) : null}
        </div>
      ) : (
        <ul
          role="list"
          data-testid="custom-widgets-list"
          className="flex flex-col divide-y divide-[var(--ag-line)]"
        >
          {customWidgets.map((cw) => (
            <li
              key={cw.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--ag-ink)]">{cw.title}</p>
                <p className="mt-0.5 text-xs text-[var(--ag-ink-subtle)]">
                  {cw.kind} · {cw.source.method}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                data-testid={`add-custom-widget-${cw.id}`}
                onClick={() => handleAdd(kindForCustomWidget(cw))}
              >
                Add
              </Button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  )
}
