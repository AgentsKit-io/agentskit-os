/**
 * ForkProvider — context that wires the fork-from-trace feature.
 *
 * Wraps the fork state machine (useForkFromTrace) and renders the ForkPanel
 * as a portal-like overlay. Any descendant can call useForkContext() to
 * trigger `forkFromTrace(traceId)`.
 */

import { createContext, useCallback, useMemo, useState } from 'react'
import { useTraceSpans } from '../screens/traces/use-traces'
import { traceToFlowDraft } from './trace-to-flow'
import { ForkPanel } from './fork-panel'
import type { ForkDraft } from './fork-types'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type ForkContextValue = {
  /** Open the fork panel for the given trace id. */
  readonly forkFromTrace: (traceId: string) => void
}

export const ForkContext = createContext<ForkContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Internal loader — fetches spans and derives draft on demand
// ---------------------------------------------------------------------------

type LoaderProps = {
  readonly pendingTraceId: string
  readonly onReady: (traceId: string, draft: ForkDraft) => void
}

function SpanLoader({ pendingTraceId, onReady }: LoaderProps): null {
  const { spans, loading } = useTraceSpans(pendingTraceId)

  if (!loading) {
    const draft = traceToFlowDraft(spans)
    // Schedule to avoid setState-during-render.
    void Promise.resolve().then(() => onReady(pendingTraceId, draft))
  }

  return null
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type ForkProviderProps = {
  readonly children: React.ReactNode
}

type PanelState =
  | { readonly open: false }
  | { readonly open: true; readonly traceId: string; readonly draft: ForkDraft }

export function ForkProvider({ children }: ForkProviderProps): React.JSX.Element {
  const [panelState, setPanelState] = useState<PanelState>({ open: false })
  const [pendingTraceId, setPendingTraceId] = useState<string | null>(null)

  const handleReady = useCallback((traceId: string, draft: ForkDraft) => {
    setPanelState({ open: true, traceId, draft })
    setPendingTraceId(null)
  }, [])

  const forkFromTrace = useCallback((traceId: string) => {
    setPendingTraceId(traceId)
  }, [])

  const handleClose = useCallback(() => {
    setPanelState({ open: false })
    setPendingTraceId(null)
  }, [])

  const value = useMemo<ForkContextValue>(() => ({ forkFromTrace }), [forkFromTrace])

  return (
    <ForkContext.Provider value={value}>
      {children}
      {/* Span loader fires when a fork is requested */}
      {pendingTraceId !== null && (
        <SpanLoader pendingTraceId={pendingTraceId} onReady={handleReady} />
      )}
      {/* Panel renders when draft is ready */}
      {panelState.open && (
        <ForkPanel
          isOpen
          traceId={panelState.traceId}
          initialDraft={panelState.draft}
          onClose={handleClose}
        />
      )}
    </ForkContext.Provider>
  )
}
