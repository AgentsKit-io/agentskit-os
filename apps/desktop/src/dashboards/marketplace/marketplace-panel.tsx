/**
 * MarketplacePanel — modal listing curated dashboard templates.
 *
 * Each template shows a name, description, and "Use this layout" button
 * that creates a new dashboard from the template's layout.
 *
 * A "Browse remote marketplace" stub is included at the bottom;
 * remote integration is tracked by TODO #234.
 */

import { useCallback, useEffect, useRef } from 'react'
import { Button } from '@agentskit/os-ui'
import { CURATED_TEMPLATES } from './marketplace-data'
import type { DashboardTemplate } from './marketplace-types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isOpen: boolean
  onClose: () => void
  /** Called when the user picks a template to apply */
  onApplyTemplate: (template: DashboardTemplate) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarketplacePanel({ isOpen, onClose, onApplyTemplate }: Props) {
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

  // Close on Escape
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  const handleApply = useCallback(
    (template: DashboardTemplate) => {
      onApplyTemplate(template)
      onClose()
    },
    [onApplyTemplate, onClose],
  )

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      data-testid="marketplace-panel"
      aria-label="Dashboard template marketplace"
      aria-modal="true"
      className="m-auto max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-0 shadow-xl backdrop:bg-black/40"
    >
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between border-b border-[var(--ag-line)] bg-[var(--ag-panel)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--ag-ink)]">
            Dashboard templates
          </h2>
          <p className="text-xs text-[var(--ag-ink-subtle)]">
            Apply a curated layout to create a new dashboard instantly.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close marketplace"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          ×
        </button>
      </div>

      {/* Template list */}
      <ul role="list" className="flex flex-col divide-y divide-[var(--ag-line)]">
        {CURATED_TEMPLATES.map((template) => (
          <li
            key={template.id}
            className="flex items-start justify-between gap-4 px-5 py-4"
          >
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-[var(--ag-ink)]">{template.name}</p>
              <p className="text-xs text-[var(--ag-ink-subtle)]">{template.description}</p>
              <p className="mt-1 text-xs text-[var(--ag-ink-muted)]">
                {template.layout.widgets.length} widget
                {template.layout.widgets.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              data-testid={`apply-template-${template.id}`}
              onClick={() => handleApply(template)}
            >
              Use this layout
            </Button>
          </li>
        ))}
      </ul>

      {/* Remote marketplace stub — TODO #234 */}
      <div className="border-t border-[var(--ag-line)] px-5 py-4">
        <div className="flex items-center justify-between rounded-lg border border-dashed border-[var(--ag-line)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--ag-ink)]">Remote marketplace</p>
            <p className="text-xs text-[var(--ag-ink-subtle)]">
              Browse community-submitted templates from the AgentsKit registry.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled
            data-testid="browse-remote-marketplace"
            title="TODO #234 — remote marketplace integration"
          >
            Coming soon
          </Button>
        </div>
      </div>
    </dialog>
  )
}
