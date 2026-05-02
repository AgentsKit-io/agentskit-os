// Pluggable spawner — abstracts child_process.spawn so tests stay
// hermetic. Real impl in default node export; in-memory fakes in tests.

export interface ChildHandle {
  readonly pid: number
  kill(): Promise<void>
}

export interface Spawner {
  spawn(opts: {
    command: string
    args: readonly string[]
    cwd?: string
    env?: Readonly<Record<string, string>>
    stdio?: 'pipe' | 'inherit' | 'ignore'
  }): Promise<ChildHandle>
}

export const nodeSpawner = async (): Promise<Spawner> => {
  const { spawn } = await import('node:child_process')
  return {
    spawn: async (opts) => {
      const child = spawn(opts.command, [...opts.args], {
        ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
        ...(opts.env !== undefined ? { env: opts.env } : {}),
        stdio: opts.stdio ?? 'pipe',
      })
      const pid = child.pid
      if (typeof pid !== 'number') {
        child.kill()
        throw new Error('failed to spawn child process')
      }
      return {
        pid,
        kill: async () => {
          if (!child.killed) child.kill()
        },
      }
    },
  }
}
