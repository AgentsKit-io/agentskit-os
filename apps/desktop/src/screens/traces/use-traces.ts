/**
 * Hook for fetching traces and spans from the sidecar.
 *
 * Requests `traces.list` + `traces.get` via sidecarRequest.
 * Falls back to mock data when the sidecar method is not yet implemented.
 *
 * TODO: remove mock fallback once sidecar implements `traces.list` / `traces.get`.
 */

import { useCallback, useEffect, useState } from 'react'
import { sidecarRequest } from '../../lib/sidecar'

// ---------------------------------------------------------------------------
// Types (mirroring @agentskit/os-observability Span shape)
// ---------------------------------------------------------------------------

export type SpanKind = 'flow' | 'agent' | 'tool' | 'human' | 'unknown'
export type SpanStatus = 'ok' | 'error' | 'skipped' | 'paused'

export type Span = {
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId?: string
  readonly kind: SpanKind
  readonly name: string
  readonly workspaceId: string
  readonly startedAt: string
  readonly endedAt: string
  readonly durationMs: number
  readonly status: SpanStatus
  readonly errorCode?: string
  readonly errorMessage?: string
  readonly attributes: Record<string, unknown>
}

export type TraceRow = {
  readonly traceId: string
  readonly flowId: string
  readonly runMode: string
  readonly startedAt: string
  readonly durationMs: number
  readonly status: SpanStatus
}

// ---------------------------------------------------------------------------
// Mock data (used when sidecar method not implemented)
// ---------------------------------------------------------------------------

export const MOCK_TRACES: readonly TraceRow[] = [
  {
    traceId: 'trace-001',
    flowId: 'onboarding-flow',
    runMode: 'real',
    startedAt: '2026-05-02T10:00:00.000Z',
    durationMs: 4320,
    status: 'ok',
  },
  {
    traceId: 'trace-002',
    flowId: 'data-pipeline',
    runMode: 'preview',
    startedAt: '2026-05-02T10:05:00.000Z',
    durationMs: 1850,
    status: 'error',
  },
  {
    traceId: 'trace-003',
    flowId: 'report-generator',
    runMode: 'dry_run',
    startedAt: '2026-05-02T10:12:00.000Z',
    durationMs: 990,
    status: 'ok',
  },
]

export const MOCK_SPANS: Record<string, readonly Span[]> = {
  'trace-001': [
    {
      traceId: 'trace-001',
      spanId: 'span-001-root',
      kind: 'flow',
      name: 'flow.started',
      workspaceId: 'ws-default',
      startedAt: '2026-05-02T10:00:00.000Z',
      endedAt: '2026-05-02T10:00:04.320Z',
      durationMs: 4320,
      status: 'ok',
      attributes: {
        'agentskitos.flow_id': 'onboarding-flow',
        'agentskitos.run_mode': 'real',
        'agentskitos.workspace_id': 'ws-default',
      },
    },
    {
      traceId: 'trace-001',
      spanId: 'span-001-agent',
      parentSpanId: 'span-001-root',
      kind: 'agent',
      name: 'agent.started',
      workspaceId: 'ws-default',
      startedAt: '2026-05-02T10:00:00.200Z',
      endedAt: '2026-05-02T10:00:03.500Z',
      durationMs: 3300,
      status: 'ok',
      attributes: {
        'agentskitos.agent_id': 'onboarding-agent',
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-sonnet-4-6',
        'gen_ai.usage.input_tokens': 512,
        'gen_ai.usage.output_tokens': 128,
      },
    },
    {
      traceId: 'trace-001',
      spanId: 'span-001-tool',
      parentSpanId: 'span-001-agent',
      kind: 'tool',
      name: 'tool.started',
      workspaceId: 'ws-default',
      startedAt: '2026-05-02T10:00:01.000Z',
      endedAt: '2026-05-02T10:00:02.800Z',
      durationMs: 1800,
      status: 'ok',
      attributes: {
        'agentskitos.node_id': 'fetch-user-data',
      },
    },
  ],
  'trace-002': [
    {
      traceId: 'trace-002',
      spanId: 'span-002-root',
      kind: 'flow',
      name: 'flow.started',
      workspaceId: 'ws-default',
      startedAt: '2026-05-02T10:05:00.000Z',
      endedAt: '2026-05-02T10:05:01.850Z',
      durationMs: 1850,
      status: 'error',
      attributes: {
        'agentskitos.flow_id': 'data-pipeline',
        'agentskitos.run_mode': 'preview',
      },
    },
    {
      traceId: 'trace-002',
      spanId: 'span-002-agent',
      parentSpanId: 'span-002-root',
      kind: 'agent',
      name: 'agent.started',
      workspaceId: 'ws-default',
      startedAt: '2026-05-02T10:05:00.300Z',
      endedAt: '2026-05-02T10:05:01.850Z',
      durationMs: 1550,
      status: 'error',
      errorCode: 'RATE_LIMIT',
      errorMessage: 'API rate limit exceeded',
      attributes: {
        'gen_ai.system': 'openai',
        'gen_ai.request.model': 'gpt-4o',
        'error.type': 'rate_limit',
      },
    },
  ],
  'trace-003': [
    {
      traceId: 'trace-003',
      spanId: 'span-003-root',
      kind: 'flow',
      name: 'flow.started',
      workspaceId: 'ws-default',
      startedAt: '2026-05-02T10:12:00.000Z',
      endedAt: '2026-05-02T10:12:00.990Z',
      durationMs: 990,
      status: 'ok',
      attributes: {
        'agentskitos.flow_id': 'report-generator',
        'agentskitos.run_mode': 'dry_run',
      },
    },
    {
      traceId: 'trace-003',
      spanId: 'span-003-tool',
      parentSpanId: 'span-003-root',
      kind: 'tool',
      name: 'tool.started',
      workspaceId: 'ws-default',
      startedAt: '2026-05-02T10:12:00.100Z',
      endedAt: '2026-05-02T10:12:00.800Z',
      durationMs: 700,
      status: 'skipped',
      attributes: {
        'agentskitos.node_id': 'generate-pdf',
      },
    },
  ],
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

type TracesState = {
  readonly traces: readonly TraceRow[]
  readonly loading: boolean
  readonly error: string | null
}

type SpansState = {
  readonly spans: readonly Span[]
  readonly loading: boolean
  readonly error: string | null
}

export const useTraces = (): TracesState => {
  const [state, setState] = useState<TracesState>({
    traces: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    const fetchTraces = async (): Promise<void> => {
      try {
        // TODO: sidecar `traces.list` method not yet implemented.
        // Attempt real call; on MethodNotFound fall back to mock data.
        const result = await sidecarRequest<readonly TraceRow[]>('traces.list')
        if (!cancelled) {
          setState({ traces: result, loading: false, error: null })
        }
      } catch {
        // Sidecar method not implemented yet — use mock data.
        if (!cancelled) {
          setState({ traces: MOCK_TRACES, loading: false, error: null })
        }
      }
    }

    void fetchTraces()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export const useTraceSpans = (traceId: string | null): SpansState => {
  const [state, setState] = useState<SpansState>({
    spans: [],
    loading: false,
    error: null,
  })

  const fetchSpans = useCallback(
    async (id: string): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      try {
        // TODO: sidecar `traces.get` method not yet implemented.
        const result = await sidecarRequest<readonly Span[]>('traces.get', {
          traceId: id,
        })
        setState({ spans: result, loading: false, error: null })
      } catch {
        // Fallback to mock data.
        const mockSpans = MOCK_SPANS[id] ?? []
        setState({ spans: mockSpans, loading: false, error: null })
      }
    },
    [],
  )

  useEffect(() => {
    if (!traceId) {
      setState({ spans: [], loading: false, error: null })
      return
    }
    void fetchSpans(traceId)
  }, [traceId, fetchSpans])

  return state
}
