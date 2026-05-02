import { describe, expect, it } from 'vitest'
import { parseRunContext } from '@agentskit/os-core'
import {
  createAgentskitToolExecutor,
  type AgentskitTool,
} from '../src/index.js'

const ctx = parseRunContext({
  runMode: 'real',
  workspaceId: 'team-a',
  runId: 'run_1',
  startedAt: '2026-05-01T00:00:00.000Z',
})

const echoTool: AgentskitTool = {
  name: 'echo',
  execute: async (args) => ({ kind: 'ok', value: args }),
}

const okShorthandTool: AgentskitTool = {
  name: 'ok-shorthand',
  execute: async () => ({ ok: true, value: 42 }),
}

const errKindTool: AgentskitTool = {
  name: 'err-kind',
  execute: async () => ({ kind: 'error', code: 'BAD', message: 'nope' }),
}

const errOkTool: AgentskitTool = {
  name: 'err-ok',
  execute: async () => ({ ok: false, code: 'BAD2', message: 'still nope' }),
}

const rawTool: AgentskitTool = {
  name: 'raw',
  execute: async () => 'plain string',
}

const throwTool: AgentskitTool = {
  name: 'thrower',
  execute: async () => { throw new Error('kaboom') },
}

describe('createAgentskitToolExecutor', () => {
  it('knows registered tools', () => {
    const ex = createAgentskitToolExecutor([echoTool])
    expect(ex.knows('echo')).toBe(true)
    expect(ex.knows('missing')).toBe(false)
  })

  it('invokes by tool id and forwards args', async () => {
    const ex = createAgentskitToolExecutor([echoTool])
    const r = await ex.invoke({ toolId: 'echo', args: { x: 1 } }, ctx)
    expect(r).toEqual({ kind: 'ok', value: { x: 1 } })
  })

  it('returns TOOL_NOT_FOUND for unknown tool', async () => {
    const ex = createAgentskitToolExecutor([echoTool])
    const r = await ex.invoke({ toolId: 'missing', args: {} }, ctx)
    expect(r).toEqual({
      kind: 'error',
      code: 'TOOL_NOT_FOUND',
      message: 'unknown tool: missing',
    })
  })

  it('passes through {kind:"ok",value} unchanged', async () => {
    const ex = createAgentskitToolExecutor([echoTool])
    const r = await ex.invoke({ toolId: 'echo', args: { hi: true } }, ctx)
    expect(r.kind).toBe('ok')
  })

  it('passes through {kind:"error",code,message} unchanged', async () => {
    const ex = createAgentskitToolExecutor([errKindTool])
    const r = await ex.invoke({ toolId: 'err-kind', args: {} }, ctx)
    expect(r).toEqual({ kind: 'error', code: 'BAD', message: 'nope' })
  })

  it('normalizes {ok:true,value} → {kind:"ok",value}', async () => {
    const ex = createAgentskitToolExecutor([okShorthandTool])
    const r = await ex.invoke({ toolId: 'ok-shorthand', args: {} }, ctx)
    expect(r).toEqual({ kind: 'ok', value: 42 })
  })

  it('normalizes {ok:false,code,message} → kind:"error"', async () => {
    const ex = createAgentskitToolExecutor([errOkTool])
    const r = await ex.invoke({ toolId: 'err-ok', args: {} }, ctx)
    expect(r).toEqual({ kind: 'error', code: 'BAD2', message: 'still nope' })
  })

  it('wraps raw return value in {kind:"ok"}', async () => {
    const ex = createAgentskitToolExecutor([rawTool])
    const r = await ex.invoke({ toolId: 'raw', args: {} }, ctx)
    expect(r).toEqual({ kind: 'ok', value: 'plain string' })
  })

  it('catches thrown errors and emits AGENTSKIT_TOOL_ERROR', async () => {
    const ex = createAgentskitToolExecutor([throwTool])
    const r = await ex.invoke({ toolId: 'thrower', args: {} }, ctx)
    expect(r).toEqual({
      kind: 'error',
      code: 'AGENTSKIT_TOOL_ERROR',
      message: 'kaboom',
    })
  })

  it('honors errorCode override on throw', async () => {
    const ex = createAgentskitToolExecutor([throwTool], { errorCode: 'CUSTOM' })
    const r = await ex.invoke({ toolId: 'thrower', args: {} }, ctx)
    expect((r as { code: string }).code).toBe('CUSTOM')
  })

  it('honors idResolver override', async () => {
    const ex = createAgentskitToolExecutor([echoTool], {
      idResolver: (t) => `ns:${t.name}`,
    })
    expect(ex.knows('ns:echo')).toBe(true)
    expect(ex.knows('echo')).toBe(false)
  })

  it('rejects duplicate tool ids at construction', () => {
    const a: AgentskitTool = { name: 'dup', execute: async () => 'a' }
    const b: AgentskitTool = { name: 'dup', execute: async () => 'b' }
    expect(() => createAgentskitToolExecutor([a, b])).toThrow('duplicate tool id "dup"')
  })

  it('coerces non-Error throws to string', async () => {
    const oddTool: AgentskitTool = {
      name: 'odd',
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      execute: async () => { throw 'string-thrown' },
    }
    const ex = createAgentskitToolExecutor([oddTool])
    const r = await ex.invoke({ toolId: 'odd', args: {} }, ctx)
    expect((r as { message: string }).message).toBe('string-thrown')
  })
})
