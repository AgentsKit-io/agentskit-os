import { describe, expect, it } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'
import { parse as parseYaml } from 'yaml'

describe('init', () => {
  it('shows help with --help', async () => {
    const r = await route(['init', '--help'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agentskit-os init')
  })

  it('rejects unknown flag', async () => {
    const r = await route(['init', '--cosmic'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('unknown flag')
  })

  it('rejects --id without value', async () => {
    const r = await route(['init', '--id'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('requires a value')
  })

  it('rejects multiple positionals', async () => {
    const r = await route(['init', 'a', 'b'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('only one positional')
  })

  it('scaffolds default workspace', async () => {
    const io = fakeIo()
    const r = await route(['init'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/agentskit-os.config.yaml')).toBe(true)
    expect(io.fs.files.has('/work/.agentskitos/.gitkeep')).toBe(true)
    expect(io.fs.files.has('/work/.gitignore')).toBe(true)

    const yaml = io.fs.files.get('/work/agentskit-os.config.yaml')!
    const parsed = parseYaml(yaml)
    expect(parsed.workspace.id).toBe('work')
    expect(parsed.workspace.name).toBe('work')
    expect(parsed.vault.backend).toBe('os-keychain')
    expect(parsed.schemaVersion).toBe(1)
  })

  it('honors --id and --name', async () => {
    const io = fakeIo()
    const r = await route(['init', '--id', 'team-alpha', '--name', 'Team Alpha'], io)
    expect(r.code).toBe(0)
    const parsed = parseYaml(io.fs.files.get('/work/agentskit-os.config.yaml')!)
    expect(parsed.workspace.id).toBe('team-alpha')
    expect(parsed.workspace.name).toBe('Team Alpha')
  })

  it('slugifies inferred id', async () => {
    const io = fakeIo()
    const r = await route(['init', '--name', 'My Agency!'], io)
    expect(r.code).toBe(0)
    const parsed = parseYaml(io.fs.files.get('/work/agentskit-os.config.yaml')!)
    expect(parsed.workspace.id).toBe('work')
    expect(parsed.workspace.name).toBe('My Agency!')
  })

  it('refuses overwrite without --force', async () => {
    const io = fakeIo({ '/work/agentskit-os.config.yaml': 'existing' })
    const r = await route(['init'], io)
    expect(r.code).toBe(4)
    expect(r.stderr).toContain('already exists')
    expect(io.fs.files.get('/work/agentskit-os.config.yaml')).toBe('existing')
  })

  it('overwrites with --force', async () => {
    const io = fakeIo({ '/work/agentskit-os.config.yaml': 'existing' })
    const r = await route(['init', '--force'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.get('/work/agentskit-os.config.yaml')).not.toBe('existing')
  })

  it('does not overwrite existing .gitignore', async () => {
    const io = fakeIo({ '/work/.gitignore': 'preserved' })
    const r = await route(['init'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.get('/work/.gitignore')).toBe('preserved')
  })

  it('produces a config that re-validates', async () => {
    const io = fakeIo()
    await route(['init', '--id', 'team-alpha', '--name', 'Team A'], io)
    const validate = await route(['config', 'validate', 'agentskit-os.config.yaml'], io)
    expect(validate.code).toBe(0)
    expect(validate.stdout).toContain('team-alpha')
  })

  it('uses dir argument', async () => {
    const io = fakeIo()
    const r = await route(['init', 'project-x'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/project-x/agentskit-os.config.yaml')).toBe(true)
    const parsed = parseYaml(io.fs.files.get('/work/project-x/agentskit-os.config.yaml')!)
    expect(parsed.workspace.id).toBe('project-x')
  })
})
