/**
 * PreferencesPanel — modal settings panel with tabs.
 *
 * Tabs:
 *   General      — density, font size, language
 *   Accessibility — reduced motion, high contrast
 *   Telemetry    — anonymous opt-in, data export
 *   Theme        — links to existing ThemeSwitcher
 *   Shortcuts    — link that opens ShortcutsPanel (if available)
 *
 * Changes are buffered in local state until the user clicks Save.
 * Cancel discards changes. Reset restores defaults.
 */

import { useState, useCallback } from 'react'
import { GlassPanel } from '@agentskit/os-ui'
import { usePreferences } from './preferences-provider'
import { GeneralTab } from './preferences-tabs/general'
import { AccessibilityTab } from './preferences-tabs/accessibility'
import { TelemetryTab } from './preferences-tabs/telemetry'
import type { Preferences } from './preferences-types'

// ---------------------------------------------------------------------------
// Tab definition
// ---------------------------------------------------------------------------

type TabId = 'general' | 'accessibility' | 'telemetry' | 'theme' | 'shortcuts'

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'theme', label: 'Theme' },
  { id: 'shortcuts', label: 'Shortcuts' },
]

// ---------------------------------------------------------------------------
// ThemeTabContent
// ---------------------------------------------------------------------------

function ThemeTabContent() {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--ag-ink-subtle)]">
        Theme selection is available in the sidebar via the Theme Switcher. Changes apply
        immediately and are persisted across sessions.
      </p>
      <p className="text-[12px] text-[var(--ag-ink-subtle)]">
        Available themes: Dark, Light, Cyber, System.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ShortcutsTabContent
// ---------------------------------------------------------------------------

type ShortcutsTabContentProps = {
  readonly onOpenShortcuts: (() => void) | undefined
}

function ShortcutsTabContent({ onOpenShortcuts }: ShortcutsTabContentProps) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--ag-ink-subtle)]">
        View and reference all keyboard shortcuts available in AgentsKitOS.
      </p>
      {onOpenShortcuts && (
        <button
          type="button"
          data-testid="open-shortcuts-btn"
          onClick={onOpenShortcuts}
          className="rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 py-1.5 text-sm text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-ink-subtle)]"
        >
          Open Keyboard Shortcuts
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export type PreferencesPanelProps = {
  readonly isOpen: boolean
  readonly onClose: () => void
  /** Optional callback to open the shortcuts panel. */
  readonly onOpenShortcuts?: () => void
}

export function PreferencesPanel({ isOpen, onClose, onOpenShortcuts }: PreferencesPanelProps) {
  const { prefs, set, reset, exportJson } = usePreferences()
  const [activeTab, setActiveTab] = useState<TabId>('general')
  // Buffer local changes until Save is clicked
  const [draft, setDraft] = useState<Preferences>(prefs)

  // Keep draft in sync when panel is opened
  const handleOpen = useCallback(() => {
    setDraft(prefs)
    setActiveTab('general')
  }, [prefs])

  // When isOpen transitions to true, sync draft
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen && !wasOpen) {
    setWasOpen(true)
    handleOpen()
  } else if (!isOpen && wasOpen) {
    setWasOpen(false)
  }

  const handleSave = () => {
    set(draft)
    onClose()
  }

  const handleReset = () => {
    reset()
    // Reload default prefs from context after reset
    import('./preferences-types').then(({ DEFAULT_PREFERENCES }) => {
      setDraft(DEFAULT_PREFERENCES)
    })
  }

  const handleExport = () => {
    const json = exportJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'preferences.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDraftChange = (partial: Partial<Preferences>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Preferences"
        aria-modal="true"
        data-testid="preferences-panel"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <GlassPanel className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--ag-ink)]">Preferences</h2>
            <button
              type="button"
              aria-label="Close preferences"
              data-testid="close-preferences"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
            >
              ×
            </button>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Tab sidebar */}
            <nav
              aria-label="Preferences sections"
              className="w-36 shrink-0 border-r border-[var(--ag-line)] px-2 py-3"
            >
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`tab-${id}`}
                  onClick={() => setActiveTab(id)}
                  aria-current={activeTab === id ? 'true' : undefined}
                  className={[
                    'mb-0.5 w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                    activeTab === id
                      ? 'bg-[var(--ag-accent)]/15 font-medium text-[var(--ag-accent)]'
                      : 'text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'general' && (
                <GeneralTab prefs={draft} onChange={handleDraftChange} />
              )}
              {activeTab === 'accessibility' && (
                <AccessibilityTab prefs={draft} onChange={handleDraftChange} />
              )}
              {activeTab === 'telemetry' && (
                <TelemetryTab
                  prefs={draft}
                  onChange={handleDraftChange}
                  onExport={handleExport}
                />
              )}
              {activeTab === 'theme' && <ThemeTabContent />}
              {activeTab === 'shortcuts' && (
                <ShortcutsTabContent onOpenShortcuts={onOpenShortcuts} />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--ag-line)] px-5 py-3">
            <button
              type="button"
              data-testid="reset-preferences"
              onClick={handleReset}
              className="text-[13px] text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
            >
              Reset to defaults
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="cancel-preferences"
                onClick={onClose}
                className="rounded-md border border-[var(--ag-line)] px-4 py-1.5 text-sm text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="save-preferences"
                onClick={handleSave}
                className="rounded-md bg-[var(--ag-accent)] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </>
  )
}
