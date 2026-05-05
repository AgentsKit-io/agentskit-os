import { describe, expect, it } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'

// ---------------------------------------------------------------------------
// Config fixtures
// ---------------------------------------------------------------------------

/** Minimal config with a two-tool flow (no agent nodes → zero USD estimate). */
const minimalConfig = `
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

/** Config with an agent node so we can see it listed in the estimate table. */
const agentConfig = `
schemaVersion: 1
workspace:
  schemaVersion: 1
  id: team-a
  name: Team A
vault:
  backend: os-keychain
security: {}
observability: {}
agents:
  - id: reviewer
    name: Reviewer
    model:
      provider: openai
      model: gpt-4o
      maxTokens: 4000
flows:
  - id: agent-flow
    name: Agent Flow
    entry: review
    nodes:
      - id: review
        kind: agent
        agent: reviewer
    edges: []
`

/** Config with WorkspaceLimits that are very tight (easy to exceed). */
const limitedConfig = `
schemaVersion: 1
workspace:
  schemaVersion: 1
  id: team-a
  name: Team A
  limits:
    tokensPerRun: 1
vault:
  backend: os-keychain
security: {}
observability: {}
agents:
  - id: reviewer
    name: Reviewer
    model:
      provider: openai
      model: gpt-4o
      maxTokens: 4000
flows:
  - id: agent-flow
    name: Agent Flow
    entry: review
    nodes:
      - id: review
        kind: agent
        agent: reviewer
    edges: []
`

/** Config with limits that are easy to satisfy (huge ceiling). */
const generousLimitConfig = `
schemaVersion: 1
workspace:
  schemaVersion: 1
  id: team-a
  name: Team A
  limits:
    tokensPerRun: 1000000
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
    edges: []
`

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('run --estimate', () => {
  it('prints estimate table and exits 0 (no execution)', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--estimate'],
      fakeIo({ '/work/cfg.yaml': minimalConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('cost estimate')
    expect(r.stdout).toContain('flow=pr-review')
    // Table header columns present
    expect(r.stdout).toContain('Node')
    expect(r.stdout).toContain('Tokens')
    expect(r.stdout).toContain('Est. USD')
    expect(r.stdout).toContain('TOTAL')
    // Flow was NOT executed — no "status:" line
    expect(r.stdout).not.toContain('status:')
  })

  it('lists agent ids in the estimate table for agent nodes', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'agent-flow', '--estimate'],
      fakeIo({ '/work/cfg.yaml': agentConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('reviewer')
    expect(r.stdout).toContain('4000') // token count from maxTokens
  })

  it('shows zero-token rows for non-LLM nodes', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--estimate'],
      fakeIo({ '/work/cfg.yaml': minimalConfig }),
    )
    expect(r.code).toBe(0)
    // Both nodes are tool nodes → 0 tokens each
    expect(r.stdout).toContain('0')
  })

  it('blocks with code 5 when estimate exceeds tokensPerRun limit', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'agent-flow', '--estimate'],
      fakeIo({ '/work/cfg.yaml': limitedConfig }),
    )
    expect(r.code).toBe(5)
    expect(r.stderr).toContain('os.cli.run_budget_exceeded')
    expect(r.stderr).toContain('tokensPerRun')
    expect(r.stderr).toContain('--force')
  })

  it('--force skips limit check and exits 0 even when over budget', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'agent-flow', '--estimate', '--force'],
      fakeIo({ '/work/cfg.yaml': limitedConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('cost estimate')
    expect(r.stdout).toContain('WorkspaceLimits check skipped')
  })

  it('does not block when estimate is within generous limits', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--estimate'],
      fakeIo({ '/work/cfg.yaml': generousLimitConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stderr).toBe('')
  })
})

describe('run (execution path) with budget limits', () => {
  it('blocks execution with code 5 when over-budget and no --force', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'agent-flow'],
      fakeIo({ '/work/cfg.yaml': limitedConfig }),
    )
    expect(r.code).toBe(5)
    expect(r.stderr).toContain('os.cli.run_budget_exceeded')
    expect(r.stderr).toContain('tokensPerRun')
  })

  it('--force overrides budget block on execution and completes the run', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'agent-flow', '--force'],
      fakeIo({ '/work/cfg.yaml': limitedConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('status: skipped')
  })

  it('runs normally when no limits are configured', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review'],
      fakeIo({ '/work/cfg.yaml': minimalConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('status: skipped')
  })

  it('--force flag is accepted without breaking existing run behavior', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--force'],
      fakeIo({ '/work/cfg.yaml': minimalConfig }),
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('status:')
  })
})

describe('--estimate flag: edge cases', () => {
  it('rejects unknown flag alongside --estimate', async () => {
    const r = await route(
      ['run', 'cfg.yaml', '--flow', 'pr-review', '--estimate', '--cosmic'],
      fakeIo({ '/work/cfg.yaml': minimalConfig }),
    )
    expect(r.code).toBe(2)
    expect(r.stderr).toMatch(/unknown (flag|option)/i)
  })

  it('--estimate included in help text', async () => {
    const r = await route(['run', '--help'])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toContain('--estimate')
    expect(out).toContain('--force')
  })
})
