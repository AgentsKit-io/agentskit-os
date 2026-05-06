/**
 * marketplace-stub — Theme marketplace section (stub implementation).
 *
 * Shows a "Coming soon" badge and a short list of sample themes that can be
 * previewed by clicking. A real backend integration will be wired in #234.
 *
 * TODO(#234): Replace SAMPLE_REGISTRY constant fetch with a real HTTP request
 * to the AgentsKit theme registry API endpoint once the backend is live.
 *
 * M2 / Issue #231 — Theme editor with live preview + marketplace stub.
 */

import type { ThemeOverride } from './theme-editor-types'

// ---------------------------------------------------------------------------
// Sample registry — hard-coded until #234 lands
// ---------------------------------------------------------------------------

export interface MarketplaceTheme {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly base: 'dark' | 'cyber' | 'light'
  readonly overrides: ThemeOverride
}

export const SAMPLE_REGISTRY: ReadonlyArray<MarketplaceTheme> = [
  {
    id: 'marketplace-cyber-pink',
    name: 'Cyber Pink',
    description: 'Dark base with hot-pink accents and deep purple panels.',
    base: 'cyber',
    overrides: {
      '--ag-accent': '#ff2d78',
      '--ag-accent-hover': '#ff6fa8',
      '--ag-accent-dim': '#4a0020',
      '--ag-panel': '#150d1a',
      '--ag-panel-alt': '#1d1326',
      '--ag-surface': '#0a0510',
      '--ag-surface-alt': '#0f0918',
    },
  },
  {
    id: 'marketplace-mint',
    name: 'Mint',
    description: 'Light theme with fresh mint green accents.',
    base: 'light',
    overrides: {
      '--ag-accent': '#10b981',
      '--ag-accent-hover': '#34d399',
      '--ag-accent-dim': '#d1fae5',
      '--ag-panel': '#f0fdf4',
      '--ag-panel-alt': '#dcfce7',
    },
  },
  {
    id: 'marketplace-paper',
    name: 'Paper',
    description: 'Warm off-white surface with amber ink, easy on the eyes.',
    base: 'light',
    overrides: {
      '--ag-surface': '#fdf8f0',
      '--ag-surface-alt': '#f7f0e4',
      '--ag-surface-dim': '#faf5eb',
      '--ag-panel': '#eee8d8',
      '--ag-panel-alt': '#e5ddc8',
      '--ag-ink': '#3b2e1a',
      '--ag-ink-muted': '#7a6548',
      '--ag-ink-subtle': '#a08c6a',
      '--ag-accent': '#c2761a',
      '--ag-accent-hover': '#d98c22',
      '--ag-accent-dim': '#fde8c4',
      '--ag-line': '#d6c9b2',
      '--ag-line-soft': '#e8ddc8',
    },
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MarketplaceStubProps {
  /** Called when the user clicks "Preview" on a sample theme. */
  readonly onPreview: (overrides: ThemeOverride) => void
}

export function MarketplaceStub({ onPreview }: MarketplaceStubProps) {
  return (
    <section aria-label="Theme marketplace" className="space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--ag-ink)]">Theme Marketplace</h3>
        <span
          className="rounded-full border border-[var(--ag-accent)]/40 bg-[var(--ag-accent)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ag-accent)]"
          aria-label="Coming soon"
        >
          Coming soon
        </span>
      </div>

      <p className="text-[12px] text-[var(--ag-ink-subtle)]">
        Browse community-submitted themes. Full marketplace available in a future release.
      </p>

      {/* Sample theme cards */}
      <ul className="space-y-2" data-testid="marketplace-list">
        {SAMPLE_REGISTRY.map((mt) => (
          <li
            key={mt.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 py-2"
          >
            <div>
              <p className="text-[13px] font-medium text-[var(--ag-ink)]">{mt.name}</p>
              <p className="text-[11px] text-[var(--ag-ink-subtle)]">{mt.description}</p>
            </div>
            <button
              type="button"
              data-testid={`preview-${mt.id}`}
              onClick={() => onPreview(mt.overrides)}
              className="rounded-full border border-[var(--ag-line)] px-2.5 py-1 text-[12px] text-[var(--ag-ink-muted)] transition-colors hover:border-[var(--ag-accent)]/50 hover:text-[var(--ag-accent)]"
            >
              Preview
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
