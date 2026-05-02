// In-process "sandbox" — no isolation. For built-in trusted tools only.
// Per ADR-0010 only safe for sideEffect: 'none' tools.

import type { SandboxRuntime } from '@agentskit/os-core'

export const noneSandbox: SandboxRuntime = {
  level: 'none',
  name: 'in-process',
  spawn: async () => {
    throw new Error(
      'noneSandbox.spawn rejected: "none" level is for in-process compute only; use process or higher to run external commands',
    )
  },
}
