// Process-level isolation. Spawns child processes through pluggable
// Spawner. M1 ships only the boundary; seccomp / job-object hardening
// lands in M6 via SECURITY ADR follow-up.

import type { SandboxRuntime } from '@agentskit/os-core'
import { nodeSpawner, type Spawner } from './spawner.js'

export type ProcessRuntimeOptions = {
  readonly spawner?: Spawner
  readonly defaultEnv?: Readonly<Record<string, string>>
  readonly defaultCwd?: string
}

const ALLOWED_ENV_KEYS = new Set([
  'PATH',
  'HOME',
  'TZ',
  'LANG',
  'LC_ALL',
  'NODE_ENV',
])

const filterEnv = (env: Readonly<Record<string, string>>): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(env)) {
    if (ALLOWED_ENV_KEYS.has(k) || k.startsWith('AGENTSKITOS_')) out[k] = v
  }
  return out
}

export const processSandbox = (opts: ProcessRuntimeOptions = {}): SandboxRuntime => {
  const spawnerPromise = opts.spawner ? Promise.resolve(opts.spawner) : nodeSpawner()
  return {
    level: 'process',
    name: 'child-process',
    spawn: async (callOpts) => {
      const spawner = await spawnerPromise
      const env = filterEnv(opts.defaultEnv ?? {})
      const handle = await spawner.spawn({
        command: callOpts.command,
        args: [...callOpts.args],
        ...(callOpts.cwd !== undefined
          ? { cwd: callOpts.cwd }
          : opts.defaultCwd !== undefined
            ? { cwd: opts.defaultCwd }
            : {}),
        env,
        stdio: 'pipe',
      })
      return {
        pid: handle.pid,
        kill: async () => handle.kill(),
      }
    },
  }
}

export const exposeAllowedEnvKeys = (): readonly string[] => [...ALLOWED_ENV_KEYS]
