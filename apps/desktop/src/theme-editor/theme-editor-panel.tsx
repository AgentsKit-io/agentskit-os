/**
 * ThemeEditorPanel - modal UI for the theme editor.
 *
 * Layout:
 *   Left pane - token list grouped by section with color pickers / text inputs.
 *   Right pane - live preview mini-cards (Card, Button, Badge, GlassPanel).
 *   Top bar - base theme selector.
 *   Footer - Save, Save As New, Reset, Export, Import.
 *   Bottom - MarketplaceStub.
 *
 * M2 / Issue #231 — Theme editor with live preview + marketplace stub.
 */

import { useRef, type ChangeEvent } from 'react'
import {
  GlassPanel,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from '@agentskit/os-ui'
import { X } from 'lucide-react'
import {
  TOKEN_SECTIONS,
  getTokensBySection,
  type BaseTheme,
  type CustomTheme,
} from './theme-editor-types'
import { useThemeEditor } from './use-theme-editor'
import { exportThemeJson, importThemeJson } from './theme-editor-store'
import { MarketplaceStub } from './marketplace-stub'

// ---------------------------------------------------------------------------
// Base theme selector
// ---------------------------------------------------------------------------

const BASE_THEME_OPTIONS: ReadonlyArray<{ value: BaseTheme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'cyber', label: 'Cyber' },
  { value: 'light', label: 'Light' },
]

function BaseThemeSelector({
  value,
  onChange,
}: {
  value: BaseTheme
  onChange: (base: BaseTheme) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-[var(--ag-ink-subtle)]">Base:</span>
      <div className="flex gap-1" role="group" aria-label="Base theme">
        {BASE_THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            data-testid={`base-theme-${opt.value}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={[
              'rounded-full border px-3 py-1 text-[12px] font-medium transition',
              value === opt.value
                ? 'border-[var(--ag-accent)] bg-[color-mix(in_srgb,var(--ag-accent)_12%,transparent)] text-[var(--ag-accent)]'
                : 'border-[var(--ag-line)] text-[var(--ag-ink-muted)] hover:border-[var(--ag-accent)]/50 hover:text-[var(--ag-ink)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Token row
// ---------------------------------------------------------------------------

function TokenRow({
  varName,
  label,
  kind,
  value,
  onChange,
}: {
  varName: string
  label: string
  kind: 'color' | 'text'
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <label
        htmlFor={`token-${varName}`}
        className="flex-1 truncate text-[12px] text-[var(--ag-ink-muted)]"
        title={varName}
      >
        {label}
      </label>
      {kind === 'color' ? (
        <div className="flex items-center gap-1.5">
          <input
            id={`token-${varName}`}
            type="color"
            data-testid={`color-picker-${varName}`}
            value={value.startsWith('#') ? value : '#000000'}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-[var(--ag-line)] bg-transparent p-0.5"
            aria-label={`${label} color`}
          />
          <input
            type="text"
            aria-label={`${label} hex value`}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            className="w-20 rounded border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-2 py-1 text-[11px] font-mono text-[var(--ag-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
          />
        </div>
      ) : (
        <input
          id={`token-${varName}`}
          type="text"
          data-testid={`text-input-${varName}`}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className="w-32 rounded border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-2 py-1 text-[11px] text-[var(--ag-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
          aria-label={label}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Live preview pane
// ---------------------------------------------------------------------------

function LivePreview({ resolvedTokens }: { resolvedTokens: Record<string, string> }) {
  // Build an inline-style object so the preview pane reflects current edits
  // independently of the document-level CSS vars (which are also applied via
  // the hook, but this provides an isolated display).
  const style = Object.fromEntries(
    Object.entries(resolvedTokens).map(([k, v]) => [k, v]),
  ) as React.CSSProperties

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-[var(--ag-line)] bg-[var(--ag-glass-bg)] p-3 [backdrop-filter:var(--ag-glass-blur)]"
      style={style}
      aria-label="Live preview"
      data-testid="live-preview"
    >
      <p className="text-[11px] uppercase tracking-widest text-[var(--ag-ink-subtle)]">Preview</p>

      {/* Mini Card */}
      <Card className="p-0">
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-[13px]">Sample Card</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-[12px] text-[var(--ag-ink-muted)]">
            Surfaces · panels · ink colours.
          </p>
        </CardContent>
      </Card>

      {/* Button row */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="primary">
          Primary
        </Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="ghost">
          Ghost
        </Button>
      </div>

      {/* Badge row */}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="default">Default</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>

      {/* GlassPanel snippet */}
      <GlassPanel className="px-3 py-2 text-[12px] text-[var(--ag-ink-muted)]">
        GlassPanel overlay
      </GlassPanel>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Saved theme list
// ---------------------------------------------------------------------------

function SavedThemeList({
  themes,
  onLoad,
}: {
  themes: CustomTheme[]
  onLoad: (t: CustomTheme) => void
}) {
  if (themes.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-widest text-[var(--ag-ink-subtle)]">
        Saved themes
      </p>
      <ul>
        {themes.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              data-testid={`load-theme-${t.id}`}
              onClick={() => onLoad(t)}
            className="w-full truncate rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
            >
              {t.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export interface ThemeEditorPanelProps {
  readonly isOpen: boolean
  readonly onClose: () => void
}

export function ThemeEditorPanel({ isOpen, onClose }: ThemeEditorPanelProps) {
  const {
    baseTheme,
    setBaseTheme,
    overrides,
    setToken,
    reset,
    themeName,
    setThemeName,
    save,
    saveAsNew,
    resolvedTokens,
    savedThemes,
    loadTheme,
    previewOverrides,
  } = useThemeEditor()

  const importRef = useRef<HTMLInputElement>(null)

  const resolveTokenValue = (varName: string): string => {
    const override = overrides[varName]
    if (override !== undefined) return override
    return resolvedTokens[varName] ?? ''
  }

  const handleExport = () => {
    const theme = {
      id: `export-${Date.now()}`,
      name: themeName,
      base: baseTheme,
      overrides,
    }
    const json = exportThemeJson(theme)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${themeName.toLowerCase().replace(/\s+/g, '-')}.theme.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const theme = importThemeJson(ev.target?.result as string)
        loadTheme(theme)
      } catch {
        // TODO: surface parse errors to user in a toast/notification
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
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
        aria-label="Theme editor"
        aria-modal="true"
        data-testid="theme-editor-panel"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <GlassPanel className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl shadow-2xl">
          {/* ---- Header ---- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ag-line)] px-5 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-[15px] font-semibold text-[var(--ag-ink)]">Theme Editor</h2>
              <BaseThemeSelector value={baseTheme} onChange={setBaseTheme} />
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                aria-label="Import theme JSON file"
                data-testid="import-file-input"
                onChange={handleImport}
              />
              <button
                type="button"
                aria-label="Close theme editor"
                data-testid="close-theme-editor"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ag-ink-muted)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ---- Body ---- */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {/* Left: token editor + saved themes */}
            <div className="flex max-h-[34vh] shrink-0 flex-col gap-4 overflow-y-auto border-b border-[var(--ag-line)] px-4 py-4 lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
              {/* Theme name input */}
              <div>
                <label
                  htmlFor="theme-name-input"
                  className="mb-1 block text-[11px] uppercase tracking-widest text-[var(--ag-ink-subtle)]"
                >
                  Theme name
                </label>
                <input
                  id="theme-name-input"
                  type="text"
                  data-testid="theme-name-input"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] px-2 py-1.5 text-[13px] text-[var(--ag-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]"
                />
              </div>

              {/* Token sections */}
              {TOKEN_SECTIONS.map((section) => (
                <div key={section}>
                  <p className="mb-1.5 text-[11px] uppercase tracking-widest text-[var(--ag-ink-subtle)]">
                    {section}
                  </p>
                  {getTokensBySection(section).map((token) => (
                    <TokenRow
                      key={token.varName}
                      varName={token.varName}
                      label={token.label}
                      kind={token.kind}
                      value={resolveTokenValue(token.varName)}
                      onChange={(v) => setToken(token.varName, v)}
                    />
                  ))}
                </div>
              ))}

              {/* Saved themes */}
              <SavedThemeList themes={savedThemes} onLoad={loadTheme} />
            </div>

            {/* Right: live preview + marketplace */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <LivePreview resolvedTokens={resolvedTokens} />
              <MarketplaceStub onPreview={previewOverrides} />
            </div>
          </div>

          {/* ---- Footer ---- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ag-line)] px-5 py-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="import-theme-btn"
                onClick={() => importRef.current?.click()}
                className="text-[13px] text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
              >
                Import
              </button>
              <button
                type="button"
                data-testid="export-theme-btn"
                onClick={handleExport}
                className="text-[13px] text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
              >
                Export
              </button>
              <button
                type="button"
                data-testid="reset-theme-btn"
                onClick={reset}
                className="text-[13px] text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
              >
                Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="cancel-theme-editor"
                onClick={onClose}
                className="rounded-full border border-[var(--ag-line)] px-4 py-1.5 text-sm text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="save-as-new-theme-btn"
                onClick={() => saveAsNew()}
                className="rounded-full border border-[var(--ag-line)] bg-[var(--ag-panel)] px-4 py-1.5 text-sm text-[var(--ag-ink)] transition-colors hover:bg-[var(--ag-panel-alt)]"
              >
                Save As New
              </button>
              <button
                type="button"
                data-testid="save-theme-btn"
                onClick={() => save()}
                className="rounded-full bg-[var(--ag-accent)] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
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
