/**
 * FocusToggle — small icon button for the sidebar that toggles focus mode.
 *
 * Uses the lucide-react `Maximize2` icon (and `Minimize2` when active).
 */

import { Maximize2, Minimize2 } from 'lucide-react'
import { useFocus } from './focus-provider'

export function FocusToggle() {
  const { active, toggle } = useFocus()

  return (
    <button
      type="button"
      data-testid="focus-toggle"
      aria-label={active ? 'Exit focus mode' : 'Enter focus mode'}
      aria-pressed={active}
      onClick={toggle}
      className="rounded p-0.5 text-[var(--ag-ink-subtle)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
    >
      {active ? (
        <Minimize2 className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Maximize2 className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  )
}
