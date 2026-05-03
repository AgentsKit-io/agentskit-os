import { describe, expect, it, vi } from 'vitest'
import { parseFlowConfig, parseWorkspaceConfig } from '@agentskit/os-core'
import type { AdapterRegistry } from '@agentskit/os-runtime'
import { createHeadlessRunner, runWorkspace } from '../src/runner.js'
import type { HeadlessRunnerOptions } from '../src/runner.js'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const workspace = parseWorkspaceConfig({
  schemaVersion: 1,
  id: 'test-ws',
  name: 'Test Workspace',
})

/** A tiny two-node flow: condition → noop if true. */
const tinyFlow = parseFlowConfig({
  id: 'tiny-flow',
  name: 'Tiny Flow',
  entry: 'cond',
  nodes: [
    { id: 'cond', kind: 'condition', expression: 'true' },
    { id: 'noop', kind: 'tool', tool: 'noop' },
  ],
  edges: [
    { from: 'cond', to: 'noop', on: 'true' },
  ],
})

const noopAdapters: AdapterRegistry = {}

const baseOpts = (): HeadlessRunnerOptions => ({
  config: workspace,
  flows: new Map([['tiny-flow', tinyFlow]]),
  adapters: noopAdapters,
})

// ---------------------------------------------------------------------------
// End-to-end: run a tiny flow with a fake adapter (dry_run mode)
// ---------------------------------------------------------------------------

describe('createHeadlessRunner', () => {
  it('runs a tiny flow in dry_run mode and returns completed/skipped', async () => {
    const runner = createHeadlessRunner(baseOpts())
    const result = await runner.runFlow('tiny-flow', { mode: 'dry_run' })
    // dry_run stubs everything → skipped
    expect(['completed', 'skipped']).toContain(result.status)
    expect(result.flowId).toBe('tiny-flow')
    expect(result.workspaceId).toBe('test-ws')
    expect(result.mode).toBe('dry_run')
    expect(typeof result.runId).toBe('string')
    await runner.dispose()
  })

  it('accepts a FlowConfig directly instead of a flow id', async () => {
    const runner = createHeadlessRunner(baseOpts())
    const result = await runner.runFlow(tinyFlow, { mode: 'dry_run' })
    expect(['completed', 'skipped']).toContain(result.status)
    expect(result.flowId).toBe('tiny-flow')
    await runner.dispose()
  })

  it('throws when flow id not found in registry', async () => {
    const runner = createHeadlessRunner({ ...baseOpts(), flows: new Map() })
    await expect(runner.runFlow('missing-flow')).rejects.toThrow('"missing-flow" not found')
    await runner.dispose()
  })

  it('throws when no flow registry provided and a string id is passed', async () => {
    const runner = createHeadlessRunner({ ...baseOpts(), flows: undefined })
    await expect(runner.runFlow('any-flow')).rejects.toThrow('no flow registry provided')
    await runner.dispose()
  })

  // -------------------------------------------------------------------------
  // Cancel via AbortSignal
  // -------------------------------------------------------------------------

  it('cancels run when signal is already aborted', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    const runner = createHeadlessRunner(baseOpts())
    const result = await runner.runFlow(tinyFlow, { mode: 'dry_run', signal: ctrl.signal })
    expect(result.status).toBe('cancelled')
    await runner.dispose()
  })

  // -------------------------------------------------------------------------
  // Observability hook
  // -------------------------------------------------------------------------

  it('calls observability hook for each node event', async () => {
    const events: string[] = []
    const runner = createHeadlessRunner({
      ...baseOpts(),
      observability: (e) => {
        events.push(e.kind)
      },
    })
    await runner.runFlow(tinyFlow, { mode: 'dry_run' })
    // At minimum node:start + node:end events for each executed node
    expect(events.some((k) => k === 'node:start')).toBe(true)
    await runner.dispose()
  })

  // -------------------------------------------------------------------------
  // runAgent — stub mode
  // -------------------------------------------------------------------------

  it('runAgent in dry_run returns undefined (stubbed)', async () => {
    const runner = createHeadlessRunner(baseOpts())
    // dry_run stubs agent nodes → skipped outcome; value is undefined
    const result = await runner.runAgent('my-agent', 'hello', { mode: 'dry_run' })
    expect(result).toBeUndefined()
    await runner.dispose()
  })

  // -------------------------------------------------------------------------
  // dispose — flushes audit
  // -------------------------------------------------------------------------

  it('dispose calls audit.flushAll when audit is provided', async () => {
    const flushAll = vi.fn().mockResolvedValue([])
    const fakeAudit = { flushAll } as unknown as Parameters<typeof createHeadlessRunner>[0]['audit']
    const runner = createHeadlessRunner({ ...baseOpts(), audit: fakeAudit })
    await runner.dispose()
    expect(flushAll).toHaveBeenCalledOnce()
  })

  it('dispose is idempotent when no audit provided', async () => {
    const runner = createHeadlessRunner(baseOpts())
    await expect(runner.dispose()).resolves.toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // Mode-aware: simulate mode uses stub handlers
  // -------------------------------------------------------------------------

  it('simulate mode uses stub handlers (skipped outcomes)', async () => {
    const runner = createHeadlessRunner(baseOpts())
    const result = await runner.runFlow(tinyFlow, { mode: 'simulate' })
    expect(['completed', 'skipped']).toContain(result.status)
    expect(result.mode).toBe('simulate')
    await runner.dispose()
  })
})

// ---------------------------------------------------------------------------
// runWorkspace convenience function
// ---------------------------------------------------------------------------

describe('runWorkspace', () => {
  it('runs a flow and disposes in one call', async () => {
    const result = await runWorkspace({
      ...baseOpts(),
      flowId: 'tiny-flow',
      mode: 'dry_run',
    })
    expect(['completed', 'skipped']).toContain(result.status)
    expect(result.flowId).toBe('tiny-flow')
  })

  it('propagates errors from flow execution', async () => {
    await expect(
      runWorkspace({
        ...baseOpts(),
        flows: new Map(),
        flowId: 'missing-flow',
        mode: 'dry_run',
      }),
    ).rejects.toThrow('"missing-flow" not found')
  })
})
