import { describe, expect, it } from 'vitest'
import { parseRunContext } from '@agentskit/os-core'
import {
  createAgentskitMemoryAdapter,
  type AgentskitMemoryStore,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_1',
  startedAt: '2026-05-01T00:00:00.000Z',
})

const fakeStore = (initial: Record<string, unknown> = {}): AgentskitMemoryStore & { state: Map<string, unknown> } => {
  const state = new Map<string, unknown>(Object.entries(initial))
  return {
    id: 'fake-store',
    state,
    get: async (key) => state.get(key),
    set: async (key, value) => { state.set(key, value) },
  }
}

describe('createAgentskitMemoryAdapter', () => {
  it('uses store id by default', () => {
    const a = createAgentskitMemoryAdapter(fakeStore())
    expect(a.id).toBe('fake-store')
  })

  it('falls back to default id when store omits one', () => {
    const a = createAgentskitMemoryAdapter({
      get: async () => undefined,
      set: async () => undefined,
    })
    expect(a.id).toBe('agentskit-memory')
  })

  it('honors id override', () => {
    const a = createAgentskitMemoryAdapter(fakeStore(), { id: 'custom' })
    expect(a.id).toBe('custom')
  })

  it('reads through to the underlying store', async () => {
    const store = fakeStore({ greeting: 'hi' })
    const a = createAgentskitMemoryAdapter(store)
    expect(await a.read('greeting', ctx)).toBe('hi')
  })

  it('returns undefined for missing keys', async () => {
    const a = createAgentskitMemoryAdapter(fakeStore())
    expect(await a.read('nope', ctx)).toBeUndefined()
  })

  it('writes through to the underlying store', async () => {
    const store = fakeStore()
    const a = createAgentskitMemoryAdapter(store)
    await a.write('count', 42, ctx)
    expect(store.state.get('count')).toBe(42)
  })

  it('honors keyResolver for namespacing', async () => {
    const store = fakeStore()
    const a = createAgentskitMemoryAdapter(store, {
      keyResolver: (ref, c) => `${c.workspaceId}:${ref}`,
    })
    await a.write('x', 1, ctx)
    expect(store.state.get('team-a:x')).toBe(1)
  })

  it('keyResolver applies to read too', async () => {
    const store = fakeStore({ 'team-a:y': 'scoped' })
    const a = createAgentskitMemoryAdapter(store, {
      keyResolver: (ref, c) => `${c.workspaceId}:${ref}`,
    })
    expect(await a.read('y', ctx)).toBe('scoped')
  })
})
