#!/usr/bin/env node
/**
 * sidecar.mjs — thin Node.js sidecar shim for AgentsKitOS desktop.
 *
 * Serves JSON-RPC 2.0 over stdio.
 * - Reads newline-delimited JSON requests from stdin.
 * - Writes newline-delimited JSON responses/notifications to stdout.
 *
 * Methods exposed:
 *   health.ping          — liveness check
 *   runner.runFlow       — delegate to HeadlessRunner.runFlow
 *   runner.runAgent      — delegate to HeadlessRunner.runAgent
 *   runner.dispose       — flush audit + teardown
 *
 * Observability events from the runner are forwarded as JSON-RPC 2.0
 * notifications: { jsonrpc: "2.0", method: "event", params: {...} }
 *
 * TODO(#37): wire real WorkspaceConfig + AdapterRegistry once the desktop
 * workspace config UI (issue #44) ships and can supply credentials at runtime.
 * For now the runner is created in dry_run mode as a safe default.
 */

// @ts-check

import { createInterface } from 'node:readline'

// ---------------------------------------------------------------------------
// Import os-headless (will be available once pnpm packages are built).
// Gracefully degrade if the package hasn't been built yet.
// ---------------------------------------------------------------------------

/** @type {import('@agentskit/os-headless').HeadlessRunner | null} */
let runner = null
/** @type {((opts: unknown) => import('@agentskit/os-headless').HeadlessRunner) | null} */
let createHeadlessRunnerFn = null
/** @type {unknown} */
let baseRunnerOpts = null

/** @type {Array<unknown>} */
const traceRows = []
/** @type {Map<string, Array<unknown>>} */
const traceSpans = new Map()
let traceCounter = 0

/** @type {Map<string, unknown>} */
const flowRegistry = new Map()
/** @type {Map<string, unknown>} */
const flowMeta = new Map()

const tryInitRunner = async () => {
  try {
    const { createHeadlessRunner } = await import('@agentskit/os-headless')
    createHeadlessRunnerFn = createHeadlessRunner

    // Minimal stub adapters for the dry_run default mode.
    // TODO(#37): replace with real adapters injected from workspace config.
    /** @type {import('@agentskit/os-runtime').AdapterRegistry} */
    const stubAdapters = {
      llm: {
        complete: async (_req) => ({ content: '', usage: { inputTokens: 0, outputTokens: 0 } }),
      },
      tool: {
        execute: async (_req) => ({ output: null }),
      },
    }

    baseRunnerOpts = {
      config: {
        id: 'desktop-default',
        name: 'Desktop Default Workspace',
        version: '0.0.0',
      },
      adapters: stubAdapters,
    }

    runner = createHeadlessRunner({
      ...baseRunnerOpts,
      observability: (event) => {
        notify('event', { timestamp: nowIso(), type: `flow.${event.kind}`, data: event })
      },
    })
  } catch (err) {
    // Log to stderr only — stdout is reserved for JSON-RPC.
    process.stderr.write(`[sidecar] os-headless not available: ${err?.message ?? err}\n`)
  }
}

// ---------------------------------------------------------------------------
// JSON-RPC helpers
// ---------------------------------------------------------------------------

/**
 * @param {number | string} id
 * @param {unknown} result
 */
const respond = (id, result) => {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result })
  process.stdout.write(msg + '\n')
}

/**
 * @param {number | string} id
 * @param {number} code
 * @param {string} message
 */
const respondError = (id, code, message) => {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })
  process.stdout.write(msg + '\n')
}

/**
 * @param {string} method
 * @param {unknown} params
 */
const notify = (method, params) => {
  const msg = JSON.stringify({ jsonrpc: '2.0', method, params })
  process.stdout.write(msg + '\n')
}

const nowIso = () => new Date().toISOString()

/** @param {unknown} flow */
const indexNodeKinds = (flow) => {
  /** @type {Record<string, string>} */
  const out = {}
  const nodes = Array.isArray(flow?.nodes) ? flow.nodes : []
  for (const n of nodes) {
    if (n && typeof n.id === 'string' && typeof n.kind === 'string') out[n.id] = n.kind
  }
  return out
}

/** @param {string} kind */
const spanKindForNodeKind = (kind) => {
  if (kind === 'agent') return 'agent'
  if (kind === 'tool') return 'tool'
  if (kind === 'human') return 'human'
  return 'unknown'
}

const defaultDemoFlow = (flowId) => ({
  id: flowId,
  name: 'Desktop demo flow',
  tags: ['desktop'],
  entry: 'agent-1',
  nodes: [
    { id: 'agent-1', kind: 'agent', agent: 'demo-agent' },
    { id: 'tool-1', kind: 'tool', tool: 'demo-tool' },
    { id: 'human-1', kind: 'human', prompt: 'Approve demo step?' },
  ],
  edges: [
    { from: 'agent-1', to: 'tool-1', on: 'always' },
    { from: 'tool-1', to: 'human-1', on: 'always' },
  ],
})

const ensureFlowExists = (flowId) => {
  if (flowRegistry.has(flowId)) return
  const flow = defaultDemoFlow(flowId)
  flowRegistry.set(flowId, flow)
  flowMeta.set(flowId, {
    id: flowId,
    name: flow.name,
    status: 'draft',
    trigger: 'manual',
    version: 'v0.0.0',
    owner: 'Local',
    runs24h: 0,
    successRatePct: 0,
    avgDurationMs: 0,
    lastRunAt: nowIso(),
    nodes: flow.nodes.map((n) => n.id),
    edges: flow.edges.map((e) => `${e.from} -> ${e.to}`),
    notes: ['Local in-memory flow registry (sidecar)'],
  })
}

const forkDraftToFlow = (flowId, draft) => {
  const nodes = Array.isArray(draft?.nodes) ? draft.nodes : []
  const edges = Array.isArray(draft?.edges) ? draft.edges : []
  const firstNode = nodes[0]?.id ?? 'start'
  const flow = {
    id: flowId,
    name: typeof draft?.name === 'string' ? draft.name : flowId,
    tags: ['fork'],
    entry: firstNode,
    nodes: nodes.map((n) => {
      if (n.kind === 'agent') return { id: n.id, kind: 'agent', agent: n.agent ?? 'demo-agent' }
      if (n.kind === 'tool') return { id: n.id, kind: 'tool', tool: n.tool ?? 'demo-tool' }
      if (n.kind === 'human') return { id: n.id, kind: 'human', prompt: 'Approval required' }
      if (n.kind === 'flow') return { id: n.id, kind: 'condition' }
      return { id: n.id, kind: 'condition' }
    }),
    edges: edges.map((e) => ({ from: e.source, to: e.target, on: 'always' })),
  }
  return flow
}

const newTraceId = () => {
  traceCounter += 1
  return `trace-${Date.now()}-${traceCounter}`
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/**
 * @param {{ id: number | string, method: string, params?: unknown }} req
 */
const dispatch = async (req) => {
  const { id, method, params } = req

  const handler = DISPATCH_HANDLERS[method]
  if (!handler) {
    respondError(id, -32601, `Method not found: ${method}`)
    return
  }
  await handler({ id, params })
}

/**
 * @typedef {{ id: number | string, params?: unknown }} DispatchCtx
 * @typedef {(ctx: DispatchCtx) => Promise<void> | void} DispatchHandler
 */

/** @type {Record<string, DispatchHandler>} */
const DISPATCH_HANDLERS = {
  'health.ping': ({ id }) => {
    respond(id, { pong: true, ts: Date.now() })
  },
  'runner.runFlow': async ({ id, params }) => {
    await handleRunnerRunFlow({ id, params })
  },
  'runner.runAgent': async ({ id, params }) => {
    await handleRunnerRunAgent({ id, params })
  },
  'runner.dispose': async ({ id }) => {
    await handleRunnerDispose({ id })
  },
  'traces.list': ({ id }) => {
    respond(id, traceRows)
  },
  'traces.get': ({ id, params }) => {
    const p = /** @type {Record<string, unknown>} */ (params ?? {})
    const traceId = /** @type {string} */ (p['traceId'])
    respond(id, traceSpans.get(traceId) ?? [])
  },
  'flows.list': ({ id }) => {
    respond(id, [...flowMeta.values()])
  },
  'flows.get': ({ id, params }) => {
    const p = /** @type {Record<string, unknown>} */ (params ?? {})
    const flowId = /** @type {string} */ (p['flowId'])
    ensureFlowExists(flowId)
    respond(id, flowRegistry.get(flowId) ?? null)
  },
  'flows.create': ({ id, params }) => {
    handleFlowsCreate({ id, params })
  },
  'cloud.deploy': ({ id }) => {
    const startedAt = nowIso()
    notify('event', { timestamp: startedAt, type: 'deploy.queued', data: { target: 'cloud' } })
    respond(id, { status: 'queued', target: 'cloud', url: 'https://cloud.agentskit.io/' })
  },
}

/** @param {{ id: number | string }} args */
const handleRunnerDispose = async ({ id }) => {
  if (runner) {
    await runner.dispose()
    runner = null
  }
  respond(id, { disposed: true })
}

/** @param {{ id: number | string, params?: unknown }} args */
const handleRunnerRunAgent = async ({ id, params }) => {
  if (!runner) {
    respondError(id, -32001, 'runner not initialized')
    return
  }
  try {
    const p = /** @type {Record<string, unknown>} */ (params ?? {})
    const result = await runner.runAgent(
      /** @type {string} */ (p['agentId']),
      p['input'],
      { mode: /** @type {import('@agentskit/os-core').RunMode | undefined} */ (p['mode']) },
    )
    respond(id, result)
  } catch (err) {
    respondError(id, -32000, err instanceof Error ? err.message : String(err))
  }
}

/** @param {{ id: number | string, params?: unknown }} args */
const handleRunnerRunFlow = async ({ id, params }) => {
  if (!runner || !createHeadlessRunnerFn || !baseRunnerOpts) {
    respondError(id, -32001, 'runner not initialized')
    return
  }
  try {
    const p = /** @type {Record<string, unknown>} */ (params ?? {})
    const { traceId, startedAt, rootSpanId, flowId, flow, nodeKinds, nodeStartIso } = setupTraceRun(p)
    const runRunner = createHeadlessRunnerFn({
      ...baseRunnerOpts,
      observability: (event) => handleObservabilityEvent({ traceId, rootSpanId, nodeKinds, nodeStartIso, event }),
    })
    const result = await runFlowAndDispose({ runRunner, flow, p })
    finalizeTrace({ traceId, startedAt, result })
    respond(id, result)
  } catch (err) {
    respondError(id, -32000, err instanceof Error ? err.message : String(err))
  }
}

/** @param {Record<string, unknown>} p */
const setupTraceRun = (p) => {
  const traceId = newTraceId()
  const startedAt = nowIso()
  const flowId = /** @type {string} */ (p['flowId'])
  const mode = /** @type {string | undefined} */ (p['mode']) ?? 'dry_run'
  ensureFlowExists(flowId)
  const flow = flowRegistry.get(flowId) ?? defaultDemoFlow(flowId)
  const nodeKinds = indexNodeKinds(flow)
  /** @type {Map<string, string>} */
  const nodeStartIso = new Map()

  const rootSpanId = `${traceId}-span-root`
  traceSpans.set(traceId, [
    {
      traceId,
      spanId: rootSpanId,
      kind: 'flow',
      name: 'flow.started',
      workspaceId: 'desktop-default',
      startedAt,
      endedAt: startedAt,
      durationMs: 0,
      status: 'ok',
      attributes: {
        'agentskitos.flow_id': flowId,
        'agentskitos.run_mode': mode,
        'trace.source': 'desktop-sidecar',
      },
    },
  ])
  traceRows.unshift({ traceId, flowId, runMode: mode, startedAt, durationMs: 0, status: 'ok' })
  notify('event', { timestamp: startedAt, type: 'trace.started', data: { traceId, flowId, mode } })

  return { traceId, startedAt, rootSpanId, flowId, flow, nodeKinds, nodeStartIso }
}

const handleObservabilityEvent = ({ traceId, rootSpanId, nodeKinds, nodeStartIso, event }) => {
  notify('event', { timestamp: nowIso(), type: `flow.${event.kind}`, data: event })
  const spans = traceSpans.get(traceId) ?? []
  if (event.kind === 'node:start') return recordNodeStart({ traceId, rootSpanId, nodeKinds, nodeStartIso, spans, event })
  if (event.kind === 'node:end') return recordNodeEnd({ traceId, nodeStartIso, spans, event })
}

const recordNodeStart = ({ traceId, rootSpanId, nodeKinds, nodeStartIso, spans, event }) => {
  const nodeId = event.nodeId
  nodeStartIso.set(nodeId, nowIso())
  const started = nodeStartIso.get(nodeId) ?? nowIso()
  const kind = spanKindForNodeKind(nodeKinds[nodeId] ?? 'unknown')
  spans.push({
    traceId,
    spanId: `${traceId}-span-${nodeId}`,
    parentSpanId: rootSpanId,
    kind,
    name: `node.start`,
    workspaceId: 'desktop-default',
    startedAt: started,
    endedAt: started,
    durationMs: 0,
    status: 'ok',
    attributes: { 'agentskitos.node_id': nodeId, 'agentskitos.node_kind': nodeKinds[nodeId] ?? 'unknown' },
  })
  traceSpans.set(traceId, spans)
}

const recordNodeEnd = ({ traceId, nodeStartIso, spans, event }) => {
  const nodeId = event.nodeId
  const ended = nowIso()
  const started = nodeStartIso.get(nodeId) ?? ended
  const status = outcomeStatus(event.outcome)
  const spanId = `${traceId}-span-${nodeId}`
  const span = spans.find((s) => s.spanId === spanId)
  if (span) {
    span.endedAt = ended
    span.durationMs = Math.max(0, Date.parse(ended) - Date.parse(started))
    span.status = status
    if (event.outcome?.kind === 'failed') {
      span.errorCode = event.outcome.error?.code
      span.errorMessage = event.outcome.error?.message
    }
  }
  traceSpans.set(traceId, spans)
}

const runFlowAndDispose = async ({ runRunner, flow, p }) => {
  const result = await runRunner.runFlow(flow, {
    input: p['input'],
    mode: /** @type {import('@agentskit/os-core').RunMode | undefined} */ (p['mode']),
  })
  await runRunner.dispose()
  return result
}

const outcomeStatus = (outcome) => {
  if (outcome?.kind === 'failed') return 'error'
  if (outcome?.kind === 'paused') return 'paused'
  if (outcome?.kind === 'skipped') return 'skipped'
  return 'ok'
}

/** @param {{ traceId: string, startedAt: string, result: unknown }} args */
const finalizeTrace = ({ traceId, startedAt, result }) => {
  const resultRecord = /** @type {Record<string, unknown>} */ (
    typeof result === 'object' && result !== null ? result : {}
  )
  const statusRaw = resultRecord['status']
  const runIdRaw = resultRecord['runId']
  const statusStr = typeof statusRaw === 'string' ? statusRaw : 'unknown'
  const runId = typeof runIdRaw === 'string' ? runIdRaw : ''
  const endedAt = nowIso()
  const spans = traceSpans.get(traceId) ?? []
  const root = spans[0]
  if (root) {
    root.endedAt = endedAt
    root.durationMs = Math.max(0, Date.parse(endedAt) - Date.parse(startedAt))
    root.status = statusStr === 'succeeded' ? 'ok' : 'error'
  }
  const row = traceRows.find((t) => t.traceId === traceId)
  if (row) {
    row.durationMs = root?.durationMs ?? 0
    row.status = root?.status ?? 'ok'
  }

  notify('event', { timestamp: endedAt, type: 'trace.completed', data: { traceId, status: root?.status ?? 'ok' } })
  notify('event', { timestamp: endedAt, type: 'flow.complete', data: { runId, status: statusStr } })
}

/** @param {{ id: number | string, params?: unknown }} args */
const handleFlowsCreate = ({ id, params }) => {
  const p = /** @type {Record<string, unknown>} */ (params ?? {})
  const draft = p['draft']
  const draftRecord = draft && typeof draft === 'object' ? /** @type {Record<string, unknown>} */ (draft) : {}
  const draftName = draftRecord['name']
  const baseName = typeof draftName === 'string' && draftName.trim().length > 0 ? draftName.trim() : 'flow'
  const newId = `flow-${Date.now()}`
  const flow = forkDraftToFlow(newId, draft)
  flowRegistry.set(newId, flow)
  flowMeta.set(newId, {
    id: newId,
    name: flow.name ?? baseName,
    status: 'draft',
    trigger: 'manual',
    version: 'v0.0.0',
    owner: 'Fork',
    runs24h: 0,
    successRatePct: 0,
    avgDurationMs: 0,
    lastRunAt: nowIso(),
    nodes: flow.nodes.map((n) => n.id),
    edges: flow.edges.map((e) => `${e.from} -> ${e.to}`),
    notes: ['Created from fork draft'],
  })
  notify('event', { timestamp: nowIso(), type: 'flows.created', data: { flowId: newId, name: flow.name } })
  respond(id, { flowId: newId })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  await tryInitRunner()

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })

  rl.on('line', (line) => {
    const trimmed = line.trim()
    if (!trimmed) return

    /** @type {unknown} */
    let parsed
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      // Invalid JSON — write a parse error with null id.
      const msg = JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      })
      process.stdout.write(msg + '\n')
      return
    }

    const req = /** @type {{ id: number | string, method: string, params?: unknown }} */ (parsed)
    dispatch(req).catch((err) => {
      process.stderr.write(`[sidecar] unhandled dispatch error: ${err?.message ?? err}\n`)
    })
  })

  rl.on('close', () => {
    process.exit(0)
  })
}

main().catch((err) => {
  process.stderr.write(`[sidecar] fatal: ${err?.message ?? err}\n`)
  process.exit(1)
})
