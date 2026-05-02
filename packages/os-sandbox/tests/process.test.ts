import { describe, expect, it } from 'vitest'
import { exposeAllowedEnvKeys, processSandbox } from '../src/index.js'
import { fakeSpawner } from './_fake-spawner.js'

describe('processSandbox', () => {
  it('declares level + name', () => {
    const sb = processSandbox({ spawner: fakeSpawner() })
    expect(sb.level).toBe('process')
    expect(sb.name).toBe('child-process')
  })

  it('spawns through injected spawner', async () => {
    const spawner = fakeSpawner()
    const sb = processSandbox({ spawner })
    const handle = await sb.spawn({ command: 'echo', args: ['hi'] })
    expect(spawner.calls).toHaveLength(1)
    expect(spawner.calls[0]?.command).toBe('echo')
    expect(spawner.calls[0]?.args).toEqual(['hi'])
    expect(handle.pid).toBeGreaterThan(0)
  })

  it('forwards cwd from call when provided', async () => {
    const spawner = fakeSpawner()
    const sb = processSandbox({ spawner })
    await sb.spawn({ command: 'echo', args: [], cwd: '/work' })
    expect(spawner.calls[0]?.cwd).toBe('/work')
  })

  it('falls back to defaultCwd when call omits cwd', async () => {
    const spawner = fakeSpawner()
    const sb = processSandbox({ spawner, defaultCwd: '/sandbox' })
    await sb.spawn({ command: 'echo', args: [] })
    expect(spawner.calls[0]?.cwd).toBe('/sandbox')
  })

  it('strips disallowed env keys', async () => {
    const spawner = fakeSpawner()
    const sb = processSandbox({
      spawner,
      defaultEnv: {
        PATH: '/usr/bin',
        SECRET_KEY: 'super-secret',
        AGENTSKITOS_RUN_ID: 'run_1',
      },
    })
    await sb.spawn({ command: 'env', args: [] })
    const env = spawner.calls[0]?.env ?? {}
    expect(env.PATH).toBe('/usr/bin')
    expect(env.AGENTSKITOS_RUN_ID).toBe('run_1')
    expect((env as Record<string, unknown>).SECRET_KEY).toBeUndefined()
  })

  it('always uses pipe stdio', async () => {
    const spawner = fakeSpawner()
    const sb = processSandbox({ spawner })
    await sb.spawn({ command: 'echo', args: [] })
    expect(spawner.calls[0]?.stdio).toBe('pipe')
  })

  it('kill() forwards to handle', async () => {
    const spawner = fakeSpawner()
    const sb = processSandbox({ spawner })
    const h = await sb.spawn({ command: 'echo', args: [] })
    await h.kill()
    expect(spawner.killed).toContain(h.pid)
  })
})

describe('exposeAllowedEnvKeys', () => {
  it('lists base allow-list', () => {
    const keys = exposeAllowedEnvKeys()
    expect(keys).toContain('PATH')
    expect(keys).toContain('HOME')
    expect(keys).toContain('NODE_ENV')
  })
})
