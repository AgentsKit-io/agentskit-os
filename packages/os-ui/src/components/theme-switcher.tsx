import { useTheme } from '../theme/theme-provider'
import type { Theme } from '../theme/theme-provider'
import { cn } from '../lib/cn'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'cyber', label: 'Cyber' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
]

export interface ThemeSwitcherProps {
  /** Extra class names applied to the wrapper element. */
  className?: string
}

/**
 * ThemeSwitcher — cycles through dark / cyber / light / system themes.
 *
 * Renders a small button row that calls `useTheme().setTheme()`.
 * Must be rendered inside a `<ThemeProvider>`.
 */
export function ThemeSwitcher({ className }: ThemeSwitcherProps): React.JSX.Element {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Select color theme"
      className={cn('flex items-center gap-1', className)}
    >
      {THEMES.map(({ value, label }) => {
        const isActive = theme === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isActive}
            aria-label={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'bg-[var(--ag-accent)] text-[var(--ag-surface)] shadow-sm'
                : 'text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)] hover:bg-[var(--ag-panel-alt)]',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
