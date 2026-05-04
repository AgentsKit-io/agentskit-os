import { describe, expect, it } from 'vitest'
import {
  buildChangelogEntries,
  renderAgentChangelog,
  renderManifestChangelogs,
} from '../../src/runtime/agent-changelog.js'
import type { AgentVersion, AgentVersionSnapshot } from '../../src/schema/agent-version.js'

const fakeHasher = (s: string): string => {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h).toString(16).padStart(64, '0').slice(-64)
}

const snap = (overrides: Partial<AgentVersionSnapshot> = {}): AgentVersionSnapshot => ({
  prompt: 'be helpful',
  model: { provider: 'anthropic', name: 'claude-sonnet-4-6' },
  tools: ['search'],
  dependencies: [],
  lifecycleState: 'draft',
  riskTier: 'low',
  capabilities: ['read'],
  ...overrides,
})

const v = (semver: string, snapshot: AgentVersionSnapshot, at = '2026-05-04T12:00:00.000Z'): AgentVersion => ({
  agentId: 'a',
  semver,
  contentHash: `sha256:${fakeHasher(JSON.stringify(snapshot))}`,
  snapshot,
  at,
})

describe('buildChangelogEntries', () => {
  it('first entry is initial', () => {
    const entries = buildChangelogEntries([v('0.1.0', snap())], fakeHasher)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.bump).toBe('initial')
  })

  it('detects minor on tool addition', () => {
    const entries = buildChangelogEntries(
      [v('0.1.0', snap()), v('0.2.0', snap({ tools: ['search', 'fetch'] }))],
      fakeHasher,
    )
    expect(entries[1]?.bump).toBe('minor')
    expect(entries[1]?.summary.toolsAdded).toEqual(['fetch'])
  })

  it('detects major on capability removal', () => {
    const entries = buildChangelogEntries(
      [v('0.1.0', snap({ capabilities: ['read', 'write'] })), v('1.0.0', snap({ capabilities: ['read'] }))],
      fakeHasher,
    )
    expect(entries[1]?.bump).toBe('major')
    expect(entries[1]?.summary.capabilitiesRemoved).toEqual(['write'])
  })

  it('honors gitResolver', () => {
    const entries = buildChangelogEntries(
      [v('0.1.0', snap())],
      fakeHasher,
      { gitResolver: (_h, sv) => `commit-${sv}` },
    )
    expect(entries[0]?.gitCommit).toBe('commit-0.1.0')
  })
})

describe('renderAgentChangelog', () => {
  it('renders newest first with conventional commit header', () => {
    const entries = buildChangelogEntries(
      [v('0.1.0', snap()), v('1.0.0', snap({ riskTier: 'high' }))],
      fakeHasher,
    )
    const md = renderAgentChangelog('a', entries)
    const idx010 = md.indexOf('## 0.1.0')
    const idx100 = md.indexOf('## 1.0.0')
    expect(idx100).toBeGreaterThanOrEqual(0)
    expect(idx010).toBeGreaterThan(idx100)
    expect(md).toContain('feat!')
    expect(md).toContain('risk tier changed')
  })
})

describe('renderManifestChangelogs', () => {
  it('produces one file per agent', () => {
    const files = renderManifestChangelogs(
      {
        schemaVersion: 1,
        agents: { a: [v('0.1.0', snap())], b: [v('0.1.0', snap())] },
      },
      fakeHasher,
    )
    const keys = [...files.keys()].sort()
    expect(keys).toEqual(['changelog/a.md', 'changelog/b.md'])
  })
})
