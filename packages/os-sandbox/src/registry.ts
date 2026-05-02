// SandboxRegistry resolves SandboxLevel → SandboxRuntime.
// Built-ins: none + process. container/vm/webcontainer registered by
// plugins per ADR-0010.

import type { SandboxLevel, SandboxRuntime } from '@agentskit/os-core'
import { noneSandbox } from './none-runtime.js'
import { processSandbox } from './process-runtime.js'

export class SandboxRegistry {
  private readonly map = new Map<SandboxLevel, SandboxRuntime>()

  constructor(includeBuiltins = true) {
    if (includeBuiltins) {
      this.register(noneSandbox)
      this.register(processSandbox())
    }
  }

  register(runtime: SandboxRuntime): void {
    this.map.set(runtime.level, runtime)
  }

  has(level: SandboxLevel): boolean {
    return this.map.has(level)
  }

  get(level: SandboxLevel): SandboxRuntime | undefined {
    return this.map.get(level)
  }

  list(): readonly SandboxLevel[] {
    return [...this.map.keys()]
  }

  resolveOrThrow(level: SandboxLevel): SandboxRuntime {
    const runtime = this.map.get(level)
    if (!runtime) {
      throw new Error(
        `no sandbox runtime registered for level "${level}" (have: ${this.list().join(', ')})`,
      )
    }
    return runtime
  }
}
