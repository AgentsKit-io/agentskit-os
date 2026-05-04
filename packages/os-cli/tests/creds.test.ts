import { afterEach, describe, expect, it } from 'vitest'
import { creds } from '../src/commands/creds.js'

const ENV_KEYS = [
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY',
  'GITHUB_TOKEN', 'SLACK_BOT_TOKEN', 'LINEAR_API_KEY',
  'DISCORD_BOT_TOKEN', 'TEAMS_APP_ID', 'TEAMS_APP_PASSWORD',
  'AGENTSKIT_MARKETPLACE_TOKEN',
]

const cleanEnv = () => {
  for (const k of ENV_KEYS) delete process.env[k]
}

describe('creds command', () => {
  afterEach(cleanEnv)

  it('shows help on --help', async () => {
    const r = await creds.run(['--help'])
    expect(r.code).toBe(2)
    expect(`${r.stdout}${r.stderr}`).toContain('agentskit-os creds')
  })

  it('errors when subcommand missing', async () => {
    const r = await creds.run([])
    expect(r.code).toBe(2)
    const out = `${r.stdout}${r.stderr}`
    expect(out).toMatch(/usage|help|list|check|subcommand/i)
  })

  it('list emits canonical providers', async () => {
    const r = await creds.run(['list', '--json'])
    expect(r.code).toBe(0)
    const ids = (JSON.parse(r.stdout) as { id: string }[]).map((p) => p.id)
    expect(ids).toContain('openai')
    expect(ids).toContain('slack')
  })

  it('list --air-gap drops cloud providers', async () => {
    const r = await creds.run(['list', '--json', '--air-gap'])
    const items = JSON.parse(r.stdout) as { cloud: boolean }[]
    expect(items.every((p) => !p.cloud)).toBe(true)
  })

  it('check exits 7 when cloud creds missing', async () => {
    cleanEnv()
    const r = await creds.run(['check'])
    expect(r.code).toBe(7)
    expect(r.stdout).toContain('MISSING')
  })

  it('check exits 0 in air-gap when only local providers needed', async () => {
    cleanEnv()
    const r = await creds.run(['check', '--air-gap'])
    expect(r.code).toBe(0)
  })

  it('check picks up env keys', async () => {
    cleanEnv()
    process.env.OPENAI_API_KEY = 'sk-fake'
    const r = await creds.run(['check', '--provider', 'openai', '--json'])
    expect(r.code).toBe(0)
    const results = JSON.parse(r.stdout) as { providerId: string; status: string }[]
    expect(results[0]).toEqual({ providerId: 'openai', status: 'ok', missingKeys: [] })
  })

  it('check never prints secret values', async () => {
    process.env.OPENAI_API_KEY = 'sk-supersecret-XYZ'
    const r = await creds.run(['check', '--provider', 'openai'])
    expect(r.stdout).not.toContain('sk-supersecret-XYZ')
    expect(r.stderr).not.toContain('sk-supersecret-XYZ')
  })

  it('honors --provider filter', async () => {
    const r = await creds.run(['list', '--provider', 'ollama', '--json'])
    const items = JSON.parse(r.stdout) as { id: string }[]
    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe('ollama')
  })
})
