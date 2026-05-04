import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { agentRegister } from '../src/commands/agent-register.js'
import { agentList } from '../src/commands/agent-list.js'
import { agentPromote } from '../src/commands/agent-promote.js'

const cwdAt = (path: string) => ({
  cwd: () => path,
  readFile: async () => '',
  writeFile: async () => {},
  mkdir: async () => {},
  exists: async () => false,
})

describe('agent register + list + promote --commit', () => {
  let tmp: string
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'agentskit-os-registry-'))
  })
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true })
  })

  it('register persists, list reads back', async () => {
    const root = '.agentskitos/workspaces/default'
    const reg = await agentRegister.run(
      ['--id', 'sales-bot', '--owner', 'alice', '--purpose', 'sales triage', '--workspace-root', root],
      { ...cwdAt(tmp), readFile: async () => '', writeFile: async () => {}, mkdir: async () => {}, exists: async () => false } as never,
    )
    expect(reg.code).toBe(0)
    expect(reg.stdout).toContain('registered sales-bot')

    const list = await agentList.run(
      ['--workspace-root', root, '--json'],
      cwdAt(tmp) as never,
    )
    expect(list.code).toBe(0)
    const entries = JSON.parse(list.stdout)
    expect(entries).toHaveLength(1)
    expect(entries[0].agentId).toBe('sales-bot')
    expect(entries[0].lifecycleState).toBe('draft')
  })

  it('promote --commit moves the persisted state', async () => {
    const root = '.agentskitos/workspaces/default'
    await agentRegister.run(
      ['--id', 'a1', '--owner', 'alice', '--purpose', 'x', '--workspace-root', root],
      cwdAt(tmp) as never,
    )
    const r = await agentPromote.run(
      [
        '--from', 'draft', '--to', 'review',
        '--agent-id', 'a1',
        '--actor', 'alice',
        '--workspace-root', root,
        '--commit',
        '--json',
      ],
      cwdAt(tmp) as never,
    )
    expect(r.code).toBe(0)
    const parsed = JSON.parse(r.stdout.trim())
    expect(parsed.committed).toBe(true)
    expect(parsed.event.from).toBe('draft')
    expect(parsed.event.to).toBe('review')

    const list = await agentList.run(
      ['--workspace-root', root, '--json'],
      cwdAt(tmp) as never,
    )
    const entries = JSON.parse(list.stdout)
    expect(entries.find((e: { agentId: string }) => e.agentId === 'a1').lifecycleState).toBe('review')
  })

  it('promote --commit fails when agent missing from registry', async () => {
    const r = await agentPromote.run(
      [
        '--from', 'draft', '--to', 'review',
        '--agent-id', 'nope',
        '--actor', 'alice',
        '--workspace-root', '.agentskitos/workspaces/default',
        '--commit',
      ],
      cwdAt(tmp) as never,
    )
    expect(r.code).toBe(8)
    expect(r.stderr).toContain('not found in registry')
  })

  it('promote --commit fails when registry state mismatches --from', async () => {
    const root = '.agentskitos/workspaces/default'
    await agentRegister.run(
      ['--id', 'a2', '--owner', 'alice', '--purpose', 'x', '--state', 'draft', '--workspace-root', root],
      cwdAt(tmp) as never,
    )
    const r = await agentPromote.run(
      [
        '--from', 'review', '--to', 'approved',
        '--agent-id', 'a2',
        '--actor', 'alice',
        '--workspace-root', root,
        '--commit',
        '--check', 'reviewer_signoff',
        '--check', 'eval_passing',
      ],
      cwdAt(tmp) as never,
    )
    expect(r.code).toBe(9)
    expect(r.stderr).toContain('state mismatch')
  })
})
