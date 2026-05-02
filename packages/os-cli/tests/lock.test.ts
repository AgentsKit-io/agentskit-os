import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
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
agents:
  - id: researcher
    name: Researcher
    model:
      provider: openai
      model: gpt-4o
flows:
  - id: pr-review
    name: PR Review
    entry: fetch
    nodes:
      - id: fetch
        kind: tool
        tool: gh.read
    edges: []
plugins:
  - id: web-search
    name: Web Search
    version: 1.0.0
    source: npm:@agentskit/tool-web-search
    contributes: [tool]
`

describe('lock', () => {
  it('shows help with --help', async () => {
    const r = await route(['lock', '--help'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agentskit-os lock')
  })

  it('shows help when no path', async () => {
    const r = await route(['lock'])
    expect(r.code).toBe(2)
  })

  it('rejects unknown flag', async () => {
    const r = await route(['lock', 'cfg.yaml', '--cosmic'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('unknown flag')
  })

  it('generates lockfile next to config', async () => {
    const io = fakeIo({ '/work/cfg.yaml': validConfig })
    const r = await route(['lock', 'cfg.yaml'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/agentskit-os.lock')).toBe(true)
    const lock = parseYaml(io.fs.files.get('/work/agentskit-os.lock')!)
    expect(lock.lockfileVersion).toBe(1)
    expect(lock.workspace.id).toBe('team-a')
    expect(lock.plugins).toHaveLength(1)
    expect(lock.agents).toHaveLength(1)
    expect(lock.flows).toHaveLength(1)
  })

  it('honors --out path', async () => {
    const io = fakeIo({ '/work/cfg.yaml': validConfig })
    const r = await route(['lock', 'cfg.yaml', '--out', 'custom.lock'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/custom.lock')).toBe(true)
  })

  it('--check passes when lockfile matches config', async () => {
    const io = fakeIo({ '/work/cfg.yaml': validConfig })
    await route(['lock', 'cfg.yaml'], io)
    const r = await route(['lock', 'cfg.yaml', '--check'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('matches')
  })

  it('--check fails with code 5 when lockfile missing', async () => {
    const io = fakeIo({ '/work/cfg.yaml': validConfig })
    const r = await route(['lock', 'cfg.yaml', '--check'], io)
    expect(r.code).toBe(5)
    expect(r.stderr).toContain('lockfile missing')
  })

  it('--check detects drift after config change', async () => {
    const io = fakeIo({ '/work/cfg.yaml': validConfig })
    await route(['lock', 'cfg.yaml'], io)
    const drifted = validConfig.replace('Team A', 'Team Alpha Renamed')
    io.fs.files.set('/work/cfg.yaml', drifted)
    const r = await route(['lock', 'cfg.yaml', '--check'], io)
    expect(r.code).toBe(5)
    expect(r.stderr).toContain('drift')
  })

  it('reports invalid config with code 1', async () => {
    const r = await route(
      ['lock', 'cfg.yaml'],
      fakeIo({ '/work/cfg.yaml': 'workspace:\n  id: BAD\n' }),
    )
    expect(r.code).toBe(1)
  })

  it('propagates read error with code 3', async () => {
    const r = await route(['lock', 'missing.yaml'], fakeIo({}))
    expect(r.code).toBe(3)
  })
})
