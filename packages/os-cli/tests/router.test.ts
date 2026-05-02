import { describe, expect, it } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'

describe('CLI router', () => {
  it('shows help when no args', async () => {
    const r = await route([])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('agentskit-os <command>')
  })

  it('shows help on -h / --help', async () => {
    expect((await route(['--help'])).code).toBe(0)
    expect((await route(['-h'])).code).toBe(0)
  })

  it('--version prints both versions', async () => {
    const r = await route(['--version'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('agentskit-os')
    expect(r.stdout).toContain('@agentskit/os-core')
  })

  it('rejects unknown command with code 2', async () => {
    const r = await route(['nope'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('unknown command')
  })

  it('routes "config validate" two-segment', async () => {
    const r = await route(['config', 'validate'], fakeIo({}))
    expect(r.code).toBe(2) // missing path → usage
  })
})

describe('config validate', () => {
  const validYaml = `schemaVersion: 1
workspace:
  schemaVersion: 1
  id: team-a
  name: Team A
vault:
  backend: os-keychain
security: {}
observability: {}
`

  it('passes valid YAML config', async () => {
    const r = await route(['config', 'validate', 'cfg.yaml'], fakeIo({ '/work/cfg.yaml': validYaml }))
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('valid')
    expect(r.stdout).toContain('team-a')
  })

  it('passes valid JSON config', async () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      workspace: { schemaVersion: 1, id: 'team-b', name: 'Team B' },
      vault: { backend: 'os-keychain' },
      security: {},
      observability: {},
    })
    const r = await route(['config', 'validate', 'cfg.json'], fakeIo({ '/work/cfg.json': json }))
    expect(r.code).toBe(0)
  })

  it('reports schema errors with code 1', async () => {
    const bad = 'schemaVersion: 1\nworkspace:\n  id: BAD ID\n'
    const r = await route(['config', 'validate', 'cfg.yaml'], fakeIo({ '/work/cfg.yaml': bad }))
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('invalid config')
  })

  it('reports read error with code 3', async () => {
    const r = await route(['config', 'validate', 'missing.yaml'], fakeIo({}))
    expect(r.code).toBe(3)
    expect(r.stderr).toContain('cannot read')
  })

  it('reports YAML parse error with code 1', async () => {
    const r = await route(['config', 'validate', 'cfg.yaml'], fakeIo({ '/work/cfg.yaml': '{invalid:::' }))
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('cannot parse')
  })

  it('shows command help with code 2', async () => {
    const r = await route(['config', 'validate', '--help'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agentskit-os config validate')
  })
})
