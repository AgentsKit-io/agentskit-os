/**
 * GeneralTab — density, font size, and language preferences.
 */

import type { Preferences, Density, FontSize, Language } from '../preferences-types'

const DENSITY_OPTIONS: ReadonlyArray<{ value: Density; label: string }> = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
]

const FONT_SIZE_OPTIONS: ReadonlyArray<{ value: FontSize; label: string }> = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
]

const LANGUAGE_OPTIONS: ReadonlyArray<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
]

type GeneralTabProps = {
  readonly prefs: Preferences
  readonly onChange: (partial: Partial<Preferences>) => void
}

export function GeneralTab({ prefs, onChange }: GeneralTabProps) {
  return (
    <div className="space-y-6">
      {/* Density */}
      <fieldset>
        <legend className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Density
        </legend>
        <div className="flex gap-2">
          {DENSITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              data-testid={`density-${value}`}
              onClick={() => onChange({ density: value })}
              aria-pressed={prefs.density === value}
              className={[
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                prefs.density === value
                  ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]'
                  : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-ink-subtle)] hover:text-[var(--ag-ink)]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Font size */}
      <fieldset>
        <legend className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
          Font Size
        </legend>
        <div className="flex gap-2">
          {FONT_SIZE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              data-testid={`font-size-${value}`}
              onClick={() => onChange({ fontSize: value })}
              aria-pressed={prefs.fontSize === value}
              className={[
                'rounded-md border px-3 py-1.5 text-sm transition-colors',
                prefs.fontSize === value
                  ? 'border-[var(--ag-accent)] bg-[var(--ag-accent)]/15 text-[var(--ag-accent)]'
                  : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-ink-subtle)] hover:text-[var(--ag-ink)]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Language */}
      <div>
        <label
          htmlFor="prefs-language"
          className="mb-2 block text-[12px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]"
        >
          Language
        </label>
        <select
          id="prefs-language"
          data-testid="language-select"
          value={prefs.language}
          onChange={(e) => onChange({ language: e.target.value as Language })}
          className="w-full rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface)] px-3 py-1.5 text-sm text-[var(--ag-ink)] focus:border-[var(--ag-accent)] focus:outline-none"
        >
          {LANGUAGE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
