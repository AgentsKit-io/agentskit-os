import { describe, expect, it } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'

const validConfig = `
schemaVersion: 1
workspace:
  schemaVersion: 1
  id: team-a
  name: Team A
vault:
  backend: os-keychain
security: {}
observability: {}
flows:
  - id: pr-review
    name: PR Review
    entry: fetch
    nodes:
      - id: fetch
        kind: tool
        tool: gh.read
      - id: review
        kind: tool
        tool: gh.comment
    edges:
      - from: fetch
        to: review
`

describe('run', () => {
  it('shows help when no args', async () => {
    const r = await route(['run'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agentskit-os run')
  })

  it('rejects --mode with invalid value', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--mode', 'cosmic'],
      fakeIo({ '/work/cfg.yaml': validConfig }),
    )
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('--mode')
  })

  it('rejects unknown flag', async () => {
    const r = await route(['run', 'cfg.yaml', '--flow', 'x', '--cosmic'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('unknown flag')
  })

  it('errors when --flow missing', async () => {
    const r = await route(['run', 'cfg.yaml'], fakeIo({ '/work/cfg.yaml': validConfig }))
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('--flow')
  })

  it('errors when flow id not in config', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'ghost'],
      fakeIo({ '/work/cfg.yaml': validConfig }),
    )
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('not found')
  })

  it('runs flow under default dry_run mode and reports skipped', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review'],
      fakeIo({ '/work/cfg.yaml': validConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('mode=dry_run')
    expect(r.stdout).toContain('status: skipped')
    expect(r.stdout).toContain('executed: 2')
  })

  it('honors --mode preview', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--mode', 'preview'],
      fakeIo({ '/work/cfg.yaml': validConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('mode=preview')
  })

  it('honors --workspace override', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--workspace', 'team-b'],
      fakeIo({ '/work/cfg.yaml': validConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('workspace=team-b')
  })

  it('--quiet suppresses node trace', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--quiet'],
      fakeIo({ '/work/cfg.yaml': validConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).not.toContain('→ fetch')
  })

  it('reports invalid config with code 1', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review'],
      fakeIo({ '/work/cfg.yaml': 'workspace:\n  id: BAD\n' }),
    )
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('invalid config')
  })

  it('propagates read error with code 3', async () => {
    const r = await route(['run', 'missing.yaml', '--flow', 'x'], fakeIo({}))
    expect(r.code).toBe(3)
  })

  it('--resume without --store errors usage', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--resume', 'run_x'],
      fakeIo({ '/work/cfg.yaml': validConfig }),
    )
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('--resume requires --store')
  })

  it('--store flag enables durable mode', async () => {
    const { mkdtemp, rm } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const dir = await mkdtemp(`${tmpdir()}/agentskitos-`)
    try {
      const r = await route(
        ['run', 'cfg.yaml', '--flow', 'pr-review', '--store', dir],
        fakeIo({ '/work/cfg.yaml': validConfig }),
      )
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('(durable)')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('--resume reuses provided runId', async () => {
    const { mkdtemp, rm } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const dir = await mkdtemp(`${tmpdir()}/agentskitos-`)
    try {
      const r1 = await route(
        ['run', 'cfg.yaml', '--flow', 'pr-review', '--store', dir],
        fakeIo({ '/work/cfg.yaml': validConfig }),
      )
      expect(r1.code).toBe(0)
      const match = /run (run_\S+)/.exec(r1.stdout)
      expect(match).not.toBeNull()
      const runId = match![1]!
      const r2 = await route(
        ['run', 'cfg.yaml', '--flow', 'pr-review', '--store', dir, '--resume', runId],
        fakeIo({ '/work/cfg.yaml': validConfig }),
      )
      expect(r2.code).toBe(0)
      expect(r2.stdout).toContain(`run ${runId}`)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
