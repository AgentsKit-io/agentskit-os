import { describe, expect, it } from 'vitest'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'
import { parse as parseYaml } from 'yaml'

describe('wizard', () => {
  it('shows help with --help', async () => {
    const r = await route(['wizard', '--help'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os wizard')
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

  it('reports missing creds when persona requires cloud providers', async () => {
    const prev = { o: process.env.OPENAI_API_KEY, a: process.env.ANTHROPIC_API_KEY, g: process.env.GITHUB_TOKEN }
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.GITHUB_TOKEN
    try {
      const io = fakeIo()
      const r = await route(['wizard', '--persona', 'dev'], io)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('Credential check')
      expect(r.stdout).toContain('MISSING')
      expect(r.stdout).toContain('openai')
    } finally {
      if (prev.o !== undefined) process.env.OPENAI_API_KEY = prev.o
      if (prev.a !== undefined) process.env.ANTHROPIC_API_KEY = prev.a
      if (prev.g !== undefined) process.env.GITHUB_TOKEN = prev.g
    }
  })

  it('skips cloud creds under --air-gap', async () => {
    const io = fakeIo()
    const r = await route(['wizard', '--persona', 'dev', '--air-gap'], io)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('Credential check')
    expect(r.stdout).not.toContain('MISSING')
    expect(r.stdout).toContain('skipped')
  })
})

