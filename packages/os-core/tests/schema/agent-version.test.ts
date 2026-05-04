import { describe, expect, it } from 'vitest'
import {
  applyBump,
  diffSnapshots,
  hashSnapshot,
  parseAgentVersion,
  parseAgentsManifest,
  suggestBump,
  type AgentVersionSnapshot,
} from '../../src/schema/agent-version.js'

const fakeHasher = (s: string): string => {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  const hex = Math.abs(h).toString(16).padStart(64, '0').slice(-64)
  return hex
}

const baseSnap = (overrides: Partial<AgentVersionSnapshot> = {}): AgentVersionSnapshot => ({
  prompt: 'You are a sales bot.',
  model: { provider: 'anthropic', name: 'claude-sonnet-4-6' },
  tools: ['search'],
  dependencies: [],
  lifecycleState: 'draft',
  riskTier: 'low',
  capabilities: ['read'],
  ...overrides,
})

describe('hashSnapshot', () => {
  it('produces stable hash regardless of array order', () => {
    const a = baseSnap({ tools: ['a', 'b', 'c'] })
    const b = baseSnap({ tools: ['c', 'a', 'b'] })
    expect(hashSnapshot(a, fakeHasher)).toBe(hashSnapshot(b, fakeHasher))
  })

  it('changes when prompt changes', () => {
    const a = hashSnapshot(baseSnap({ prompt: 'one' }), fakeHasher)
    const b = hashSnapshot(baseSnap({ prompt: 'two' }), fakeHasher)
    expect(a).not.toBe(b)
  })
})

describe('suggestBump', () => {
  it('none when content identical', () => {
    expect(suggestBump(baseSnap(), baseSnap(), fakeHasher)).toBe('none')
  })

  it('major when risk tier increases', () => {
    expect(suggestBump(baseSnap(), baseSnap({ riskTier: 'high' }), fakeHasher)).toBe('major')
  })

  it('major when capability removed', () => {
    expect(
      suggestBump(baseSnap({ capabilities: ['read', 'write'] }), baseSnap({ capabilities: ['read'] }), fakeHasher),
    ).toBe('major')
  })

  it('major when model.provider changes', () => {
    expect(
      suggestBump(baseSnap(), baseSnap({ model: { provider: 'openai', name: 'gpt-5' } }), fakeHasher),
    ).toBe('major')
  })

  it('minor when capability added', () => {
    expect(
      suggestBump(baseSnap({ capabilities: ['read'] }), baseSnap({ capabilities: ['read', 'write'] }), fakeHasher),
    ).toBe('minor')
  })

  it('patch when only prompt changes', () => {
    expect(
      suggestBump(baseSnap({ prompt: 'a' }), baseSnap({ prompt: 'b' }), fakeHasher),
    ).toBe('patch')
  })
})

describe('applyBump', () => {
  it('major resets minor + patch', () => expect(applyBump('1.2.3', 'major')).toBe('2.0.0'))
  it('minor resets patch', () => expect(applyBump('1.2.3', 'minor')).toBe('1.3.0'))
  it('patch increments', () => expect(applyBump('1.2.3', 'patch')).toBe('1.2.4'))
  it('none preserves', () => expect(applyBump('1.2.3', 'none')).toBe('1.2.3'))
  it('rejects invalid input', () => expect(() => applyBump('not-semver', 'patch')).toThrow(/invalid_semver/))
})

describe('diffSnapshots', () => {
  it('reports per-field changes', () => {
    const d = diffSnapshots(
      baseSnap({ prompt: 'a', tools: ['x'], capabilities: ['c1'] }),
      baseSnap({ prompt: 'b', tools: ['x', 'y'], capabilities: [] }),
    )
    expect(d.prompt).toBe('changed')
    expect(d.tools.added).toEqual(['y'])
    expect(d.capabilities.removed).toEqual(['c1'])
  })
})

describe('parseAgentVersion + parseAgentsManifest', () => {
  it('parses valid version', () => {
    const v = parseAgentVersion({
      agentId: 'sales',
      semver: '1.2.3',
      contentHash: `sha256:${'a'.repeat(64)}`,
      snapshot: baseSnap(),
      at: '2026-05-04T12:00:00.000Z',
    })
    expect(v.semver).toBe('1.2.3')
  })

  it('rejects bad content hash', () => {
    expect(() =>
      parseAgentVersion({
        agentId: 'x', semver: '1.0.0', contentHash: 'md5:short', snapshot: baseSnap(),
        at: '2026-05-04T12:00:00.000Z',
      }),
    ).toThrow()
  })

  it('parses empty manifest', () => {
    const m = parseAgentsManifest({ schemaVersion: 1 })
    expect(m.agents).toEqual({})
  })
})
