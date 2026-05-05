/**
 * ShortcutsPanel — user-facing settings UI for keyboard shortcuts.
 *
 * Features:
 *   - List all shortcuts grouped by category
 *   - Click row → record new binding (capture keydown)
 *   - Inline conflict warnings
 *   - Save / Reset individual / Reset All
 *   - Export to JSON file / Import from JSON file
 *
 * Rendered as a modal inside a GlassPanel from @agentskit/os-ui.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { GlassPanel } from '@agentskit/os-ui'
import { useShortcuts } from './shortcut-provider'
import { formatBinding, buildBindingFromEvent, type Binding } from './shortcut-types'
import { getCategories } from './shortcut-registry'
import { downloadOverrides, importOverridesFromJson } from './use-shortcut-store'
import type { ShortcutOverrides } from './use-shortcut-store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShortcutsPanelProps = {
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ShortcutsPanelState = {
  readonly all: ReturnType<typeof useShortcuts>['all']
  readonly conflicts: ReturnType<typeof useShortcuts>['conflicts']
  readonly recording: string | null
  readonly draftBinding: Binding
  readonly importError: string | null
  readonly categories: readonly string[]
  readonly conflictingIds: ReadonlySet<string>
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>
  readonly startRecording: (id: string) => void
  readonly saveRecording: () => void
  readonly cancelRecording: () => void
  readonly resetBinding: (id: string) => void
  readonly resetAll: () => void
  readonly handleExport: () => void
  readonly handleImportClick: () => void
  readonly handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function useShortcutsPanelState(args: { onClose: () => void }): ShortcutsPanelState {
  const { onClose } = args
  const { all, get, override, reset, resetAll, conflicts } = useShortcuts()

  const [recording, setRecording] = useState<string | null>(null)
  const [draftBinding, setDraftBinding] = useState<Binding>('')
  const [importError, setImportError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const conflictingIds = new Set(conflicts.flatMap(([a, b]) => [a, b]))

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && recording === null) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, recording])

  const handleRecordKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') {
      setRecording(null)
      setDraftBinding('')
      return
    }
    const newBinding = buildBindingFromEvent(e)
    if (newBinding && newBinding !== '') setDraftBinding(newBinding)
  }, [])

  useEffect(() => {
    if (recording === null) return
    window.addEventListener('keydown', handleRecordKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleRecordKeyDown, { capture: true })
  }, [recording, handleRecordKeyDown])

  const startRecording = (id: string) => {
    setDraftBinding(get(id)?.defaultBinding ?? '')
    setRecording(id)
  }

  const saveRecording = () => {
    if (recording !== null && draftBinding !== '') override(recording, draftBinding)
    setRecording(null)
    setDraftBinding('')
  }

  const cancelRecording = () => {
    setRecording(null)
    setDraftBinding('')
  }

  const handleExport = () => {
    const overrides: ShortcutOverrides = {}
    for (const s of all) {
      const defaultShortcut = all.find((x) => x.id === s.id)
      if (defaultShortcut && s.defaultBinding !== defaultShortcut.defaultBinding) {
        overrides[s.id] = s.defaultBinding
      }
    }
    downloadOverrides(overrides)
  }

  const handleImportClick = () => {
    setImportError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string
        const imported = importOverridesFromJson(json)
        for (const [id, binding] of Object.entries(imported)) {
          override(id, binding)
        }
        setImportError(null)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Import failed')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return {
    all,
    conflicts,
    recording,
    draftBinding,
    importError,
    categories: getCategories(),
    conflictingIds,
    fileInputRef,
    startRecording,
    saveRecording,
    cancelRecording,
    resetBinding: reset,
    resetAll,
    handleExport,
    handleImportClick,
    handleFileChange,
  }
}

function ShortcutsPanelHeader({
  onImport,
  onExport,
  onResetAll,
  onClose,
}: {
  readonly onImport: () => void
  readonly onExport: () => void
  readonly onResetAll: () => void
  readonly onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-6 py-4">
      <h2 className="text-base font-semibold text-[var(--ag-ink)]">Keyboard Shortcuts</h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onImport}
          className="rounded px-2 py-1 text-xs text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          Import
        </button>
        <button
          type="button"
          onClick={onExport}
          className="rounded px-2 py-1 text-xs text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          Export
        </button>
        <button
          type="button"
          onClick={onResetAll}
          className="rounded px-2 py-1 text-xs text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          Reset All
        </button>
        <button
          type="button"
          aria-label="Close keyboard shortcuts"
          onClick={onClose}
          className="ml-2 rounded p-1 text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function ShortcutsPanelAlerts({
  importError,
  conflicts,
  all,
}: {
  readonly importError: string | null
  readonly conflicts: ReturnType<typeof useShortcuts>['conflicts']
  readonly all: ReturnType<typeof useShortcuts>['all']
}) {
  return (
    <>
      {importError !== null && (
        <div
          role="alert"
          className="border-b border-[var(--ag-line)] bg-[var(--ag-danger)]/10 px-6 py-2 text-xs text-[var(--ag-danger)]"
        >
          Import failed: {importError}
        </div>
      )}

      {conflicts.length > 0 && (
        <div
          role="alert"
          className="border-b border-[var(--ag-line)] bg-[var(--ag-warn)]/10 px-6 py-2 text-xs text-[var(--ag-warn)]"
        >
          {conflicts.map(([a, b]) => {
            const sa = all.find((x) => x.id === a)
            const sb = all.find((x) => x.id === b)
            return (
              <div key={`${a}-${b}`}>
                Conflict: "{sa?.label}" and "{sb?.label}" share the same binding ({formatBinding(sa?.defaultBinding ?? '')})
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

type ShortcutRowProps = {
  readonly shortcut: (ReturnType<typeof useShortcuts>['all'])[number]
  readonly isRecording: boolean
  readonly hasConflict: boolean
  readonly recordingPreview: Binding
  readonly onStartRecording: () => void
  readonly onSave: () => void
  readonly onCancel: () => void
  readonly onReset: () => void
}

function ShortcutRow({
  shortcut,
  isRecording,
  hasConflict,
  recordingPreview,
  onStartRecording,
  onSave,
  onCancel,
  onReset,
}: ShortcutRowProps) {
  return (
    <div
      data-testid={`shortcut-row-${shortcut.id}`}
      className={[
        'group flex items-center justify-between rounded-lg px-3 py-2 transition-colors',
        isRecording ? 'bg-[var(--ag-accent)]/10 ring-1 ring-[var(--ag-accent)]/50' : 'hover:bg-[var(--ag-panel-alt)]',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--ag-ink)]">{shortcut.label}</span>
          {hasConflict && (
            <span role="img" aria-label="conflict" title="Binding conflict" className="text-[var(--ag-warn)]">
              ⚠
            </span>
          )}
        </div>
        <p className="truncate text-xs text-[var(--ag-ink-muted)]">{shortcut.description}</p>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-2">
        {isRecording ? (
          <>
            <span
              data-testid="recording-preview"
              className="min-w-[6rem] rounded border border-[var(--ag-accent)] bg-[var(--ag-surface)] px-2 py-0.5 text-center text-sm font-mono text-[var(--ag-accent)]"
            >
              {recordingPreview !== '' ? formatBinding(recordingPreview) : '…'}
            </span>
            <button
              type="button"
              onClick={onSave}
              className="rounded px-2 py-0.5 text-xs font-medium text-[var(--ag-success)] hover:bg-[var(--ag-success)]/10"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded px-2 py-0.5 text-xs text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)]"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              data-testid={`binding-${shortcut.id}`}
              onClick={onStartRecording}
              className={[
                'min-w-[6rem] rounded border px-2 py-0.5 text-center text-sm font-mono transition-colors',
                hasConflict
                  ? 'border-[var(--ag-warn)]/50 bg-[var(--ag-warn)]/5 text-[var(--ag-warn)]'
                  : 'border-[var(--ag-line)] bg-[var(--ag-surface)] text-[var(--ag-ink)] hover:border-[var(--ag-accent)]/50',
              ].join(' ')}
            >
              {formatBinding(shortcut.defaultBinding)}
            </button>
            <button
              type="button"
              aria-label={`Reset ${shortcut.label} to default`}
              onClick={onReset}
              className="invisible rounded p-1 text-[var(--ag-ink-subtle)] hover:text-[var(--ag-ink)] group-hover:visible"
            >
              ↺
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ShortcutsPanelBody({
  categories,
  all,
  recording,
  draftBinding,
  conflictingIds,
  onStartRecording,
  onSaveRecording,
  onCancelRecording,
  onReset,
}: {
  readonly categories: readonly string[]
  readonly all: ReturnType<typeof useShortcuts>['all']
  readonly recording: string | null
  readonly draftBinding: Binding
  readonly conflictingIds: ReadonlySet<string>
  readonly onStartRecording: (id: string) => void
  readonly onSaveRecording: () => void
  readonly onCancelRecording: () => void
  readonly onReset: (id: string) => void
}) {
  return (
    <div className="overflow-y-auto px-6 py-4">
      {categories.map((category) => {
        const shortcuts = all.filter((s) => s.category === category)
        if (shortcuts.length === 0) return null
        return (
          <section key={category} className="mb-6 last:mb-0">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
              {category}
            </h3>
            <div className="flex flex-col gap-px">
              {shortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.id}
                  shortcut={shortcut}
                  isRecording={recording === shortcut.id}
                  hasConflict={conflictingIds.has(shortcut.id)}
                  recordingPreview={draftBinding}
                  onStartRecording={() => onStartRecording(shortcut.id)}
                  onSave={onSaveRecording}
                  onCancel={onCancelRecording}
                  onReset={() => onReset(shortcut.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function ShortcutsPanelModal({
  onClose,
  state,
}: {
  readonly onClose: () => void
  readonly state: ShortcutsPanelState
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <GlassPanel
        className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <ShortcutsPanelHeader
          onImport={state.handleImportClick}
          onExport={state.handleExport}
          onResetAll={state.resetAll}
          onClose={onClose}
        />
        <ShortcutsPanelAlerts importError={state.importError} conflicts={state.conflicts} all={state.all} />
        <ShortcutsPanelBody
          categories={state.categories}
          all={state.all}
          recording={state.recording}
          draftBinding={state.draftBinding}
          conflictingIds={state.conflictingIds}
          onStartRecording={state.startRecording}
          onSaveRecording={state.saveRecording}
          onCancelRecording={state.cancelRecording}
          onReset={state.resetBinding}
        />
      </GlassPanel>

      <input
        ref={state.fileInputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={state.handleFileChange}
        aria-hidden="true"
      />
    </div>
  )
}

export function ShortcutsPanel({ onClose }: ShortcutsPanelProps) {
  const state = useShortcutsPanelState({ onClose })
  return <ShortcutsPanelModal onClose={onClose} state={state} />
}
