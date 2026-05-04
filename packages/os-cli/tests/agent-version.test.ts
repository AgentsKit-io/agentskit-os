import { describe, expect, it } from 'vitest'
import { agentBump, agentDiff, agentVersionList } from '../src/commands/agent-version.js'
import { fakeIo } from './_fake-io.js'

const SNAP_PATH = '/work/snap.json'
const ROOT = '.agentskitos/workspaces/default'

const snap = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  prompt: 'be helpful',
  model: { provider: 'anthropic', name: 'claude-sonnet-4-6' },
  tools: ['search'],
  dependencies: [],
  lifecycleState: 'draft',
  riskTier: 'low',
  capabilities: ['read'],
  ...overrides,
})

describe('agent bump', () => {
  it('writes the initial version when no manifest exists', async () => {
    const io = fakeIo({ [SNAP_PATH]: snap() })
    const r = await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('bumped a 0.1.0 (initial)')
    expect(io.fs.files.has('/work/.agentskitos/workspaces/default/agents.json')).toBe(true)
  })

  it('auto-bumps minor when a tool is added', async () => {
    const io = fakeIo({ [SNAP_PATH]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    io.fs.files.set(SNAP_PATH, snap({ tools: ['search', 'fetch'] }))
    const r = await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    expect(r.stdout).toContain('0.1.0 → 0.2.0 (minor)')
  })

  it('auto-bumps major when risk tier escalates', async () => {
    const io = fakeIo({ [SNAP_PATH]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    io.fs.files.set(SNAP_PATH, snap({ riskTier: 'high' }))
    const r = await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    expect(r.stdout).toContain('0.1.0 → 1.0.0 (major)')
  })

  it('reports no change when content identical', async () => {
    const io = fakeIo({ [SNAP_PATH]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    const r = await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    expect(r.stdout).toContain('no change since 0.1.0')
  })

  it('respects manual --major override', async () => {
    const io = fakeIo({ [SNAP_PATH]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    io.fs.files.set(SNAP_PATH, snap({ prompt: 'changed' }))
    const r = await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH, '--major'], io)
    expect(r.stdout).toContain('0.1.0 → 1.0.0 (major)')
  })
})

describe('agent diff + version-list', () => {
  it('diff reports tool added between two bumps', async () => {
    const io = fakeIo({ [SNAP_PATH]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    io.fs.files.set(SNAP_PATH, snap({ tools: ['search', 'fetch'] }))
    await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    const r = await agentDiff.run(['--id', 'a', '--json'], io)
    const parsed = JSON.parse(r.stdout)
    expect(parsed.diff.tools.added).toEqual(['fetch'])
  })

  it('version-list returns history', async () => {
    const io = fakeIo({ [SNAP_PATH]: snap() })
    await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    io.fs.files.set(SNAP_PATH, snap({ prompt: 'v2' }))
    await agentBump.run(['--id', 'a', '--snapshot', SNAP_PATH], io)
    const r = await agentVersionList.run(['--id', 'a', '--json'], io)
    const list = JSON.parse(r.stdout)
    expect(list).toHaveLength(2)
    expect(list[0].semver).toBe('0.1.0')
    expect(list[1].semver).toBe('0.1.1')
  })
})
