import { describe, expect, it } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'
import { parse as parseYaml } from 'yaml'

describe('wizard', () => {
  it('shows help with --help', async () => {
    const r = await route(['wizard', '--help'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agentskit-os wizard')
  })

  it('requires --persona when prompt is unavailable', async () => {
    const io = fakeIo()
    const r = await route(['wizard'], io)
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('pass --persona')
  })

  it('scaffolds a persona-routed template (flag)', async () => {
    const io = fakeIo()
    const r = await route(['wizard', '--persona', 'clinical'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('Wizard persona: clinical')
    expect(io.fs.files.has('/work/agentskit-os.config.yaml')).toBe(true)
    const parsed = parseYaml(io.fs.files.get('/work/agentskit-os.config.yaml')!)
    expect(parsed.workspace.id).toBe('clinical-consensus')
  })

  it('prompts for persona and defaults on invalid input', async () => {
    const io = fakeIo({}, {}, ['nonsense'])
    const r = await route(['wizard'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('Wizard persona: dev')
  })
})

