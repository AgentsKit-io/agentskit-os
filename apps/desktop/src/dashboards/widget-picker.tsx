/**
 * WidgetPicker — modal listing all built-in widget kinds.
 *
 * Props:
 *   isOpen   — controls visibility
 *   onClose  — called when closed without adding
 *   onAdd    — called with the chosen widget kind
 */

import { useCallback, useEffect, useRef } from 'react'
import { BUILT_IN_WIDGETS } from './widget-registry'
import { Button } from '@agentskit/os-ui'

type Props = {
  isOpen: boolean
  onClose: () => void
  onAdd: (kind: string) => void
}

export function WidgetPicker({ isOpen, onClose, onAdd }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
    </dialog>
  )
}
