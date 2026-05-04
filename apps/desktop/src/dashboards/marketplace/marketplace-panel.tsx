/**
 * MarketplacePanel — modal for browsing and applying dashboard templates.
 *
 * Shows two sections:
 *   - "Built-in" — static templates from marketplace-data.ts
 *   - "From plugins" — templates contributed by plugins via usePluginContributions()
 *                      Each plugin template shows a source-plugin pill.
 *
 * Applying a template creates a new dashboard pre-populated with the
 * template's widget slots.
 *
 * Part of M2 #248 — plugin-contributed dashboards + widgets extension point.
 */

import { useCallback, useEffect, useRef } from 'react'
import { Button } from '@agentskit/os-ui'
import { BUILT_IN_TEMPLATES } from './marketplace-data'
import { usePluginContributions } from '../../plugins/plugin-contributions-provider'
import type { MarketplaceTemplate } from './marketplace-data'
import type { PluginDashboardContribution } from '../../plugins/contribution-types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isOpen: boolean
  onClose: () => void
  /** Called with the widget slots to populate the new dashboard. */
  onApply: (template: MarketplaceTemplate | PluginDashboardContribution) => void
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SourcePill({ pluginId }: { pluginId: string }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-[var(--ag-accent)]/40 bg-[var(--ag-accent-dim)] px-2 py-0.5 text-[10px] font-medium text-[var(--ag-accent)]">
      {pluginId}
    </span>
  )
}

type TemplateRowProps = {
  name: string
  description?: string | undefined
  sourcePlugin?: string | undefined
  onApply: () => void
}

function TemplateRow({ name, description, sourcePlugin, onApply }: TemplateRowProps) {
  return (
    <li className="flex items-center justify-between px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center text-sm font-medium text-[var(--ag-ink)]">
          {name}
          {sourcePlugin && <SourcePill pluginId={sourcePlugin} />}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--ag-ink-subtle)]">{description}</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        data-testid={`marketplace-apply-${name.toLowerCase().replace(/\s+/g, '-')}`}
        onClick={onApply}
        className="ml-3 shrink-0"
      >
        Apply
      </Button>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function MarketplacePanel({ isOpen, onClose, onApply }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { dashboards: pluginDashboards } = usePluginContributions()

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
    function onCancel(e: Event) {
      e.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  const handleApply = useCallback(
    (template: MarketplaceTemplate | PluginDashboardContribution) => {
      onApply(template)
      onClose()
    },
    [onApply, onClose],
  )

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      data-testid="marketplace-panel"
      aria-label="Dashboard marketplace"
      aria-modal="true"
      className="m-auto max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-0 shadow-xl backdrop:bg-black/40"
    >
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between border-b border-[var(--ag-line)] bg-[var(--ag-panel)] px-5 py-4">
        <h2 className="text-base font-semibold text-[var(--ag-ink)]">Dashboard templates</h2>
        <button
          type="button"
          aria-label="Close marketplace"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          ×
        </button>
      </div>

      {/* Built-in section */}
      <div>
        <p className="px-5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Built-in
        </p>
        <ul role="list" className="flex flex-col divide-y divide-[var(--ag-line)]">
          {BUILT_IN_TEMPLATES.map((t) => (
            <TemplateRow
              key={t.id}
              name={t.name}
              description={t.description}
              onApply={() => handleApply(t)}
            />
          ))}
        </ul>
      </div>

      {/* Plugin section */}
      {pluginDashboards.length > 0 && (
        <div className="border-t border-[var(--ag-line)]">
          <p className="px-5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
            From plugins
          </p>
          <ul role="list" className="flex flex-col divide-y divide-[var(--ag-line)]">
            {pluginDashboards.map((pd) => (
              <TemplateRow
                key={`${pd.pluginId}:${pd.id}`}
                name={pd.layout.name}
                description={pd.layout.description}
                sourcePlugin={pd.pluginId}
                onApply={() => handleApply(pd)}
              />
            ))}
          </ul>
        </div>
      )}
    </dialog>
  )
}
