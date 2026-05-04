import { describe, expect, it } from 'vitest'
import { agentBump } from '../src/commands/agent-version.js'
import { agentChangelog } from '../src/commands/agent-changelog.js'
import { fakeIo } from './_fake-io.js'

const SNAP = '/work/snap.json'
const ROOT = '.agentskitos/workspaces/default'

const snap = (o: Record<string, unknown> = {}) => JSON.stringify({
  prompt: 'be helpful',
  model: { provider: 'anthropic', name: 'claude-sonnet-4-6' },
  tools: ['search'],
  dependencies: [],
  lifecycleState: 'draft',
  riskTier: 'low',
  capabilities: ['read'],
  ...o,
})

describe('agent changelog', () => {
  it('errors when no agents.json', async () => {
    const r = await agentChangelog.run([], fakeIo())
    expect(r.code).toBe(8)
    expect(r.stderr).toContain('not found')
  })

  it('writes one file per agent', async () => {
    const io = fakeIo({ [SNAP]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP], io)
    await agentBump.run(['--id', 'b', '--snapshot', SNAP], io)
    const r = await agentChangelog.run([], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has(`/work/${ROOT}/changelog/a.md`)).toBe(true)
    expect(io.fs.files.has(`/work/${ROOT}/changelog/b.md`)).toBe(true)
  })

  it('--json emits map without writing', async () => {
    const io = fakeIo({ [SNAP]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP], io)
    const r = await agentChangelog.run(['--json'], io)
    const obj = JSON.parse(r.stdout)
    expect(obj['changelog/a.md']).toContain('# Changelog — a')
  })

  it('--id filters to one agent', async () => {
    const io = fakeIo({ [SNAP]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP], io)
    await agentBump.run(['--id', 'b', '--snapshot', SNAP], io)
    const r = await agentChangelog.run(['--id', 'a', '--json'], io)
    const obj = JSON.parse(r.stdout)
    expect(Object.keys(obj)).toEqual(['changelog/a.md'])
  })

  it('--git-tag-prefix injects commit reference', async () => {
    const io = fakeIo({ [SNAP]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP], io)
    const r = await agentChangelog.run(['--json', '--git-tag-prefix', 'agent-a-'], io)
    const obj = JSON.parse(r.stdout)
    expect(obj['changelog/a.md']).toContain('agent-a-0.1.0')
  })
})
