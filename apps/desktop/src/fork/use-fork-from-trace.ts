/**
 * useForkFromTrace — hook for the fork-from-trace feature (M2 #178).
 *
 * Integrates trace span fetching with the fork panel state.
 * Exposes `forkFromTrace(traceId)` which loads spans, converts them to a
 * ForkDraft, and opens the fork panel.
 */

import { useCallback, useState } from 'react'
import { useTraceSpans } from '../screens/traces/use-traces'
import { traceToFlowDraft } from './trace-to-flow'
import type { ForkDraft } from './fork-types'

// ---------------------------------------------------------------------------
// Internal state shape
// ---------------------------------------------------------------------------

type ForkPanelState =
  | { readonly open: false }
  | { readonly open: true; readonly traceId: string; readonly draft: ForkDraft }

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export type UseForkFromTraceReturn = {
  /** Whether the fork panel is currently open. */
  readonly isPanelOpen: boolean
  /** The trace id currently being forked (undefined when panel is closed). */
  readonly forkTraceId: string | undefined
  /** The derived draft (undefined when panel is closed). */
  readonly forkDraft: ForkDraft | undefined
  /** Open the fork panel for the given trace id. */
  readonly forkFromTrace: (traceId: string) => void
  /** Close the fork panel. */
  readonly closeForkPanel: () => void
}

// ---------------------------------------------------------------------------
// Inner hook that loads spans on demand and exposes the fork action
// ---------------------------------------------------------------------------

function useForkSpanLoader(
  traceId: string | null,
  onDraftReady: (traceId: string, draft: ForkDraft) => void,
) {
  const { spans, loading } = useTraceSpans(traceId)

  // When spans arrive (loading done) and we have a traceId, convert to draft.
  // Caller is responsible for triggering re-render by changing traceId.
  const trigger = useCallback(
    (id: string) => {
      if (!loading && traceId === id && spans.length >= 0) {
        const draft = traceToFlowDraft(spans)
        onDraftReady(id, draft)
      }
    },
    [loading, traceId, spans, onDraftReady],
  )

  return { trigger, loading }
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * Hook that wires the fork panel lifecycle.
 *
 * Pattern: caller calls `forkFromTrace(traceId)`. This sets pendingTraceId,
 * which drives `useTraceSpans`. Once spans are available the panel opens with
 * the derived draft. The consumer renders `<ForkPanel>` using the exposed state.
 */
export function useForkFromTrace(): UseForkFromTraceReturn {
  const [panelState, setPanelState] = useState<ForkPanelState>({ open: false })
  const [pendingTraceId, setPendingTraceId] = useState<string | null>(null)

  const handleDraftReady = useCallback((traceId: string, draft: ForkDraft) => {
    setPanelState({ open: true, traceId, draft })
    setPendingTraceId(null)
  }, [])

  // Load spans whenever pendingTraceId changes.
  const { spans, loading } = useTraceSpans(pendingTraceId)

  // Synchronously derive draft once spans are loaded.
  // This runs on every render while pendingTraceId is set.
  if (
    pendingTraceId !== null &&
    !loading &&
    // Guard: don't open again if already open for same trace.
    !(panelState.open && panelState.traceId === pendingTraceId)
  ) {
    const draft = traceToFlowDraft(spans)
    // Schedule state update via setTimeout to avoid setState-during-render.
    // We call handleDraftReady on next tick.
    void Promise.resolve().then(() => handleDraftReady(pendingTraceId, draft))
  }

  const forkFromTrace = useCallback((traceId: string) => {
    setPendingTraceId(traceId)
  }, [])

  const closeForkPanel = useCallback(() => {
    setPanelState({ open: false })
    setPendingTraceId(null)
  }, [])

  if (!panelState.open) {
    return {
      isPanelOpen: false,
      forkTraceId: undefined,
      forkDraft: undefined,
      forkFromTrace,
      closeForkPanel,
    }
  }

  return {
    isPanelOpen: true,
    forkTraceId: panelState.traceId,
    forkDraft: panelState.draft,
    forkFromTrace,
    closeForkPanel,
  }
}

// ---------------------------------------------------------------------------
// Simpler variant used by ForkButton (stateless — driven by parent)
// ---------------------------------------------------------------------------

export type UseForkReturn = {
  /** Trigger fork for a given trace id — opens the panel via context. */
  readonly forkFromTrace: (traceId: string) => void
}

/**
 * Lightweight hook for components that just need to trigger a fork.
 * They receive the `forkFromTrace` callback from a parent via props or context.
 */
export function useFork(
  forkFromTrace: (traceId: string) => void,
): UseForkReturn {
  return { forkFromTrace }
}

// Re-export for convenience
export { useForkSpanLoader }
