/**
 * AccessibilityTab — reduced motion and high-contrast toggles.
 */

import type { Preferences } from '../preferences-types'

type AccessibilityTabProps = {
  readonly prefs: Preferences
  readonly onChange: (partial: Partial<Preferences>) => void
}

type ToggleRowProps = {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly testId: string
}

function ToggleRow({ id, label, description, checked, onChange, testId }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--ag-line)] px-4 py-3">
      <div className="flex-1">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-[var(--ag-ink)]">
          {label}
        </label>
        <p className="mt-0.5 text-[12px] text-[var(--ag-ink-subtle)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        data-testid={testId}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ag-accent)] focus:ring-offset-2',
          checked ? 'bg-[var(--ag-accent)]' : 'bg-[var(--ag-line)]',
        ].join(' ')}
      >
        <span
          aria-hidden
          className={[
            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

export function AccessibilityTab({ prefs, onChange }: AccessibilityTabProps) {
  return (
    <div className="space-y-3">
      <ToggleRow
        id="prefs-reduced-motion"
        testId="toggle-reduced-motion"
        label="Reduced Motion"
        description="Minimize animations and transitions throughout the interface."
        checked={prefs.reducedMotion}
        onChange={(checked) => onChange({ reducedMotion: checked })}
      />
      <ToggleRow
        id="prefs-high-contrast"
        testId="toggle-high-contrast"
        label="High Contrast"
        description="Increase colour contrast to improve readability."
        checked={prefs.highContrast}
        onChange={(checked) => onChange({ highContrast: checked })}
      />
    </div>
  )
}
