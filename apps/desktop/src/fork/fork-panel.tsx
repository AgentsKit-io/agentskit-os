/**
 * ForkPanel — modal for editing a ForkDraft and saving it as a new flow.
 *
 * Header: trace id
 * Body: ForkDraft form — name, description, node list with editable agent IDs
 * Footer: "Save as flow" → calls sidecarRequest('flows.create', { draft })
 *   On success: shows inline success state with the new flow id.
 *
 * TODO(Refs #91): sidecar `flows.create` implementation pending.
 */

import { useEffect, useRef, useState } from 'react'
import { GlassPanel } from '@agentskit/os-ui'
import type { ForkDraft, ForkNodeDraft, FlowCreateResponse } from './fork-types'
import { resolveCreatedFlowId, useCreateFlow } from './use-create-flow'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ForkPanelProps = {
  readonly isOpen: boolean
  readonly traceId: string
  readonly initialDraft: ForkDraft
  readonly onClose: () => void
  /** Called with the new flow id when the save succeeds. */
  readonly onSaved?: (flowId: string) => void
}

// ---------------------------------------------------------------------------
// Node row — editable agent/tool id field
// ---------------------------------------------------------------------------

type NodeRowProps = {
  readonly node: ForkNodeDraft
  readonly onChange: (updated: ForkNodeDraft) => void
}

function NodeRow({ node, onChange }: NodeRowProps): React.JSX.Element {
  const handleAgentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...node, agent: e.target.value || undefined })
  }

  const handleToolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...node, tool: e.target.value || undefined })
  }

  const kindLabel: Record<string, string> = {
    agent: 'Agent',
    tool: 'Tool',
    flow: 'Flow',
    human: 'Human',
    condition: 'Condition',
    unknown: 'Unknown',
  }

  return (
    <div
      data-testid="fork-node-row"
      className="flex items-start gap-3 rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 py-2"
    >
      {/* Kind badge */}
      <span
        data-testid="fork-node-kind"
        className="mt-0.5 inline-flex shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide border border-[var(--ag-line)] text-[var(--ag-ink-muted)]"
      >
        {kindLabel[node.kind] ?? node.kind}
      </span>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Label (read-only) */}
        <span className="truncate text-xs font-mono text-[var(--ag-ink)]">
          {node.label ?? node.id}
        </span>

        {/* Editable agent id */}
        {node.kind === 'agent' && (
          <input
            type="text"
            aria-label={`Agent ID for node ${node.id}`}
            placeholder="agent-id"
            value={node.agent ?? ''}
            onChange={handleAgentChange}
            className={[
              'w-full rounded border border-[var(--ag-line)] bg-[var(--ag-surface-alt)]',
              'px-2 py-1 text-xs font-mono text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-subtle)]',
              'focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]',
            ].join(' ')}
          />
        )}

        {/* Editable tool id */}
        {node.kind === 'tool' && (
          <input
            type="text"
            aria-label={`Tool ID for node ${node.id}`}
            placeholder="tool-id"
            value={node.tool ?? ''}
            onChange={handleToolChange}
            className={[
              'w-full rounded border border-[var(--ag-line)] bg-[var(--ag-surface-alt)]',
              'px-2 py-1 text-xs font-mono text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-subtle)]',
              'focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]',
            ].join(' ')}
          />
        )}
      </div>
    </div>
  )
}

type ForkBodyProps = {
  readonly savedFlowId: string | null
  readonly traceId: string
  readonly draft: ForkDraft
  readonly saving: boolean
  readonly error: string | null
  readonly onClose: () => void
  readonly onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  readonly onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  readonly onNodeChange: (index: number, updated: ForkNodeDraft) => void
  readonly onSave: () => void
}

function ForkPanelHeader({ traceId, onClose }: { readonly traceId: string; readonly onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-4 py-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <h2 className="text-sm font-semibold text-[var(--ag-ink)]">Fork as flow</h2>
        <span className="text-xs font-mono text-[var(--ag-ink-muted)] truncate" title={traceId}>
          {traceId}
        </span>
      </div>
      <button
        type="button"
        aria-label="Close fork panel"
        onClick={onClose}
        className="ml-3 shrink-0 px-1 text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)] transition-colors"
      >
        ×
      </button>
    </div>
  )
}

function ForkSuccess({ flowId, onClose }: { readonly flowId: string; readonly onClose: () => void }) {
  return (
    <div
      data-testid="fork-success"
      role="status"
      aria-live="polite"
      className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm"
    >
      <p className="font-medium text-emerald-400">Flow created!</p>
      <p className="mt-0.5 text-xs text-[var(--ag-ink-muted)]">
        New flow id: <span className="font-mono text-[var(--ag-ink)]">{flowId}</span>
      </p>
      <button
        type="button"
        aria-label={`Go to flow ${flowId}`}
        className="mt-2 text-xs text-[var(--ag-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
        onClick={onClose}
      >
        Open flow →
      </button>
    </div>
  )
}

function ForkForm({
  draft,
  error,
  onNameChange,
  onDescriptionChange,
  onNodeChange,
}: {
  readonly draft: ForkDraft
  readonly error: string | null
  readonly onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  readonly onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  readonly onNodeChange: (index: number, updated: ForkNodeDraft) => void
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="fork-name" className="text-xs font-medium text-[var(--ag-ink-muted)]">
          Flow name *
        </label>
        <input
          id="fork-name"
          type="text"
          data-testid="fork-name-input"
          value={draft.name}
          onChange={onNameChange}
          placeholder="my-flow"
          className={[
            'rounded border border-[var(--ag-line)] bg-[var(--ag-surface-alt)]',
            'px-3 py-1.5 text-sm text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-subtle)]',
            'focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]',
          ].join(' ')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="fork-description" className="text-xs font-medium text-[var(--ag-ink-muted)]">
          Description
        </label>
        <textarea
          id="fork-description"
          data-testid="fork-description-input"
          rows={2}
          value={draft.description ?? ''}
          onChange={onDescriptionChange}
          placeholder="Optional description…"
          className={[
            'resize-none rounded border border-[var(--ag-line)] bg-[var(--ag-surface-alt)]',
            'px-3 py-1.5 text-sm text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-subtle)]',
            'focus:outline-none focus:ring-1 focus:ring-[var(--ag-accent)]',
          ].join(' ')}
        />
      </div>

      {draft.nodes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--ag-ink-muted)]">Nodes ({draft.nodes.length})</p>
          <div className="flex flex-col gap-2">
            {draft.nodes.map((node, i) => (
              <NodeRow key={node.id} node={node} onChange={(updated) => onNodeChange(i, updated)} />
            ))}
          </div>
        </div>
      )}

      {error !== null && (
        <p role="alert" data-testid="fork-error" className="text-xs text-[var(--ag-danger)]">
          {error}
        </p>
      )}
    </>
  )
}

function ForkFooter({
  saving,
  name,
  onClose,
  onSave,
}: {
  readonly saving: boolean
  readonly name: string
  readonly onClose: () => void
  readonly onSave: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-[var(--ag-line)] px-4 py-3">
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 text-xs text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)] transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        data-testid="fork-save-button"
        disabled={saving || name.trim().length === 0}
        onClick={onSave}
        className={[
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
          'border border-[var(--ag-accent)] bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]',
          'transition-colors hover:bg-[var(--ag-accent)]/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ].join(' ')}
      >
        {saving ? 'Saving…' : 'Save as flow'}
      </button>
    </div>
  )
}

function ForkPanelBody({
  savedFlowId,
  traceId,
  draft,
  saving,
  error,
  onClose,
  onNameChange,
  onDescriptionChange,
  onNodeChange,
  onSave,
}: ForkBodyProps): React.JSX.Element {
  return (
    <>
      <ForkPanelHeader traceId={traceId} onClose={onClose} />

      <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
        {savedFlowId !== null && <ForkSuccess flowId={savedFlowId} onClose={onClose} />}
        {savedFlowId === null && (
          <ForkForm
            draft={draft}
            error={error}
            onNameChange={onNameChange}
            onDescriptionChange={onDescriptionChange}
            onNodeChange={onNodeChange}
          />
        )}
      </div>

      {savedFlowId === null && (
        <ForkFooter saving={saving} name={draft.name} onClose={onClose} onSave={onSave} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// ForkPanel
// ---------------------------------------------------------------------------

export function ForkPanel({
  isOpen,
  traceId,
  initialDraft,
  onClose,
  onSaved,
}: ForkPanelProps): React.JSX.Element | null {
  const [draft, setDraft] = useState<ForkDraft>(initialDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlowId, setSavedFlowId] = useState<string | null>(null)
  const createFlow = useCreateFlow()

  // Track the last initialDraft reference we seeded from.
  // When the parent passes a new object (new trace), reset form state.
  const prevInitialDraftRef = useRef<ForkDraft>(initialDraft)
  useEffect(() => {
    if (prevInitialDraftRef.current !== initialDraft) {
      prevInitialDraftRef.current = initialDraft
      setDraft(initialDraft)
      setSaving(false)
      setError(null)
      setSavedFlowId(null)
    }
  }, [initialDraft])

  if (!isOpen) return null

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((d) => ({ ...d, name: e.target.value }))
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft((d) => ({ ...d, description: e.target.value || undefined }))
  }

  const handleNodeChange = (index: number, updated: ForkNodeDraft) => {
    setDraft((d) => {
      const nodes = [...d.nodes]
      nodes[index] = updated
      return { ...d, nodes }
    })
  }

  const handleSave = async (): Promise<void> => {
    if (draft.name.trim().length === 0) {
      setError('Flow name is required.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      // TODO(Refs #91): sidecar `flows.create` implementation pending.
      // Mock: when sidecar is unavailable sidecarRequest returns {} → fallback.
      const res = await createFlow(draft)

      // Fallback when sidecar returns empty object (not yet implemented).
      const flowId = resolveCreatedFlowId(res)

      setSavedFlowId(flowId)
      onSaved?.(flowId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fork trace as flow"
      data-testid="fork-panel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <GlassPanel
        blur="md"
        className="flex w-full max-w-lg flex-col gap-0 overflow-hidden"
        style={{ maxHeight: '80vh' }}
      >
        <ForkPanelBody
          savedFlowId={savedFlowId}
          traceId={traceId}
          draft={draft}
          saving={saving}
          error={error}
          onClose={onClose}
          onNameChange={handleNameChange}
          onDescriptionChange={handleDescriptionChange}
          onNodeChange={handleNodeChange}
          onSave={() => void handleSave()}
        />
      </GlassPanel>
    </div>
  )
}
