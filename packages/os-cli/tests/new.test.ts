import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'

describe('new', () => {
  it('shows help with --help', async () => {
    const r = await route(['new', '--help'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agentskit-os new')
  })

  it('--list lists templates with code 0', async () => {
    const r = await route(['new', '--list'])
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('templates available')
    expect(r.stdout).toContain('pr-review')
    expect(r.stdout).toContain('clinical-consensus')
  })

  it('errors when no template id (and no --list)', async () => {
    const r = await route(['new'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('missing template id')
  })

  it('errors on unknown template', async () => {
    const r = await route(['new', 'nonsense'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('unknown template')
  })

  it('rejects unknown flag', async () => {
    const r = await route(['new', 'pr-review', '--cosmic'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('unknown flag')
  })

  it('scaffolds pr-review template', async () => {
    const io = fakeIo()
    const r = await route(['new', 'pr-review'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/agentskit-os.config.yaml')).toBe(true)
    const yaml = io.fs.files.get('/work/agentskit-os.config.yaml')!
    expect(yaml).toContain('scaffolded from "pr-review"')
    const parsed = parseYaml(yaml)
    expect(parsed.flows).toHaveLength(1)
    expect(parsed.agents).toHaveLength(1)
  })

  it('scaffolds into custom dir', async () => {
    const io = fakeIo()
    const r = await route(['new', 'pr-review', 'my-project'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/my-project/agentskit-os.config.yaml')).toBe(true)
    const yaml = io.fs.files.get('/work/my-project/agentskit-os.config.yaml')!
    const parsed = parseYaml(yaml)
    expect(parsed.workspace.id).toBe('my-project')
  })

  it('honors --id and --name overrides', async () => {
    const io = fakeIo()
    const r = await route(
      ['new', 'pr-review', '--id', 'team-alpha', '--name', 'Team Alpha'],
      io,
    )
    expect(r.code).toBe(0)
    const parsed = parseYaml(io.fs.files.get('/work/agentskit-os.config.yaml')!)
    expect(parsed.workspace.id).toBe('team-alpha')
    expect(parsed.workspace.name).toBe('Team Alpha')
  })

  it('refuses overwrite without --force', async () => {
    const io = fakeIo({ '/work/agentskit-os.config.yaml': 'existing' })
    const r = await route(['new', 'pr-review'], io)
    expect(r.code).toBe(4)
    expect(r.stderr).toContain('already exists')
  })

  it('overwrites with --force', async () => {
    const io = fakeIo({ '/work/agentskit-os.config.yaml': 'existing' })
    const r = await route(['new', 'pr-review', '--force'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.get('/work/agentskit-os.config.yaml')).not.toBe('existing')
  })

  it('preserves existing .gitignore', async () => {
    const io = fakeIo({ '/work/.gitignore': 'preserved' })
    const r = await route(['new', 'pr-review'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.get('/work/.gitignore')).toBe('preserved')
  })

  it('output config re-validates via config validate', async () => {
    const io = fakeIo()
    await route(['new', 'pr-review'], io)
    const r = await route(['config', 'validate', 'agentskit-os.config.yaml'], io)
    expect(r.code).toBe(0)
  })

  it('scaffolds advanced clinical-consensus template', async () => {
    const io = fakeIo()
    const r = await route(['new', 'clinical-consensus'], io)
    expect(r.code).toBe(0)
    const parsed = parseYaml(io.fs.files.get('/work/agentskit-os.config.yaml')!)
    expect(parsed.agents.length).toBeGreaterThanOrEqual(3)
    const flow = parsed.flows[0]
    expect(flow.nodes.find((n: { kind: string }) => n.kind === 'vote')).toBeDefined()
  })

  it('next-step hint references first flow id', async () => {
    const io = fakeIo()
    const r = await route(['new', 'pr-review'], io)
    expect(r.stdout).toContain('--flow pr-review-flow')
  })
})
