/**
 * StatusLineConfigPanel - modal for toggling / reordering status bar segments.
 *
 * Lists all built-in segments. Each row shows:
 *   - A checkbox to toggle visibility
 *   - The segment label
 *   - Up / Down buttons to change position within the visible list
 *
 * Only visible segments can be reordered; hidden segments are shown at the
 * bottom of the list greyed-out.
 */

import { GlassPanel } from '@agentskit/os-ui'
import { X } from 'lucide-react'
import { useStatusLineConfig } from './status-line-provider'
import { BUILT_IN_SEGMENTS } from './status-segments'

const MOVE_BUTTON_CLASS = [
  'flex h-5 w-5 items-center justify-center rounded-lg text-[var(--ag-ink-muted)]',
  'transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]',
  'disabled:cursor-not-allowed disabled:opacity-30',
].join(' ')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatusLineConfigPanelProps = {
  readonly isOpen: boolean
  readonly onClose: () => void
}

function moveIdUp(ids: readonly string[], id: string): string[] | null {
  const idx = ids.indexOf(id)
  if (idx <= 0) return null
  const next = [...ids]
  const [item] = next.splice(idx, 1)
  if (item === undefined) return null
  next.splice(idx - 1, 0, item)
  return next
}

function moveIdDown(ids: readonly string[], id: string): string[] | null {
  const idx = ids.indexOf(id)
  if (idx < 0 || idx >= ids.length - 1) return null
  const next = [...ids]
  const [item] = next.splice(idx, 1)
  if (item === undefined) return null
  next.splice(idx + 1, 0, item)
  return next
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

type SegmentRowProps = {
  readonly id: string
  readonly label: string
  readonly checked: boolean
  readonly onToggle: (id: string, visible: boolean) => void
  readonly canMoveUp: boolean
  readonly canMoveDown: boolean
  readonly onMoveUp: (id: string) => void
  readonly onMoveDown: (id: string) => void
}

function SegmentRow({
  id,
  label,
  checked,
  onToggle,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: SegmentRowProps) {
  return (
    <div
      data-testid={`segment-row-${id}`}
      className={[
        'flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors',
        checked ? '' : 'opacity-50',
      ].join(' ')}
    >
      <input
        type="checkbox"
        id={`seg-${id}`}
        data-testid={`segment-toggle-${id}`}
        checked={checked}
        onChange={(e) => onToggle(id, e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer accent-[var(--ag-accent)]"
      />
      <label
        htmlFor={`seg-${id}`}
        className="flex-1 cursor-pointer select-none text-[13px] text-[var(--ag-ink)]"
      >
        {label}
      </label>
      {checked && (
        <div className="flex gap-0.5">
          <button
            type="button"
            aria-label={`Move ${label} up`}
            data-testid={`segment-up-${id}`}
            disabled={!canMoveUp}
            onClick={() => onMoveUp(id)}
            className={MOVE_BUTTON_CLASS}
          >
            ▲
          </button>
          <button
            type="button"
            aria-label={`Move ${label} down`}
            data-testid={`segment-down-${id}`}
            disabled={!canMoveDown}
            onClick={() => onMoveDown(id)}
            className={MOVE_BUTTON_CLASS}
          >
            ▼
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function StatusLineConfigPanel({ isOpen, onClose }: StatusLineConfigPanelProps) {
  const { visibleIds, setVisible, reorder, reset } = useStatusLineConfig()

  if (!isOpen) return null

  // Ordered visible rows, then all hidden rows at the bottom.
  const visibleRows = visibleIds
    .map((id) => BUILT_IN_SEGMENTS.find((s) => s.id === id))
    .filter((s): s is (typeof BUILT_IN_SEGMENTS)[number] => s !== undefined)

  const hiddenRows = BUILT_IN_SEGMENTS.filter((s) => !visibleIds.includes(s.id))

  const handleMoveUp = (id: string) => {
    const next = moveIdUp(visibleIds, id)
    if (next) reorder(next)
  }

  const handleMoveDown = (id: string) => {
    const next = moveIdDown(visibleIds, id)
    if (next) reorder(next)
  }

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
        aria-label="Configure status line"
        aria-modal="true"
        data-testid="status-line-config-panel"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <GlassPanel className="flex max-h-[82vh] w-full max-w-sm flex-col overflow-hidden rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--ag-ink)]">
              Configure Status Line
            </h2>
            <button
              type="button"
              aria-label="Close config panel"
              data-testid="close-status-line-config"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ag-ink-muted)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-3 py-3">
            <p className="mb-3 px-2 text-[12px] text-[var(--ag-ink-subtle)]">
              Toggle segments on/off and use the arrows to change their order.
            </p>

            {visibleRows.length > 0 && (
              <div className="mb-1">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
                  Visible
                </p>
                {visibleRows.map((seg, idx) => (
                  <SegmentRow
                    key={seg.id}
                    id={seg.id}
                    label={seg.label}
                    checked
                    onToggle={setVisible}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < visibleRows.length - 1}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                  />
                ))}
              </div>
            )}

            {hiddenRows.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
                  Hidden
                </p>
                {hiddenRows.map((seg) => (
                  <SegmentRow
                    key={seg.id}
                    id={seg.id}
                    label={seg.label}
                    checked={false}
                    onToggle={setVisible}
                    canMoveUp={false}
                    canMoveDown={false}
                    onMoveUp={() => undefined}
                    onMoveDown={() => undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--ag-line)] px-5 py-3">
            <button
              type="button"
              data-testid="reset-status-line"
              onClick={reset}
              className="text-[13px] text-[var(--ag-ink-muted)] transition-colors hover:text-[var(--ag-ink)]"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              data-testid="close-status-line-config-done"
              onClick={onClose}
              className="rounded-full bg-[var(--ag-accent)] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </GlassPanel>
      </div>
    </>
  )
}
