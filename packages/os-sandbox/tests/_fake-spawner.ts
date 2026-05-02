import type { ChildHandle, Spawner } from '../src/spawner.js'

export type SpawnCall = {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd?: string
  readonly env?: Readonly<Record<string, string>>
  readonly stdio?: 'pipe' | 'inherit' | 'ignore'
}

export type FakeSpawner = Spawner & {
  readonly calls: SpawnCall[]
  readonly killed: number[]
}

export const fakeSpawner = (): FakeSpawner => {
  const calls: SpawnCall[] = []
  const killed: number[] = []
  let nextPid = 10_000
  return {
    calls,
    killed,
    spawn: async (opts) => {
      calls.push(opts)
      const pid = nextPid++
      const handle: ChildHandle = {
        pid,
        kill: async () => {
          killed.push(pid)
        },
      }
      return handle
    },
  }
}
