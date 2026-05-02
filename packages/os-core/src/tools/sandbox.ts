// Per ADR-0010. SandboxLevel + minimum-sandbox policy.

import { z } from 'zod'
import type { SideEffect } from './side-effects.js'

export const SANDBOX_LEVELS = ['none', 'process', 'container', 'vm', 'webcontainer'] as const
export type SandboxLevel = (typeof SANDBOX_LEVELS)[number]
export const SandboxLevel = z.enum(SANDBOX_LEVELS)

const RANK: Record<SandboxLevel, number> = {
  none: 0,
  process: 1,
  webcontainer: 1,
  container: 2,
  vm: 3,
}

export const MIN_SANDBOX_FOR: Record<SideEffect, SandboxLevel> = {
  none: 'none',
  read: 'process',
  write: 'process',
  destructive: 'container',
  external: 'container',
}

export type SandboxDecision =
  | { kind: 'apply'; level: SandboxLevel; reason: string }
  | { kind: 'reject'; reason: string }

export const decideSandbox = (
  effects: readonly SideEffect[],
  requested: SandboxLevel | undefined,
  force = false,
): SandboxDecision => {
  let minRequired: SandboxLevel = 'none'
  for (const e of effects) {
    if (RANK[MIN_SANDBOX_FOR[e]] > RANK[minRequired]) minRequired = MIN_SANDBOX_FOR[e]
  }

  if (requested === undefined) {
    return { kind: 'apply', level: minRequired, reason: 'using default min sandbox for declared effects' }
  }

  if (RANK[requested] >= RANK[minRequired]) {
    return { kind: 'apply', level: requested, reason: 'workspace elevation respected' }
  }

  if (force) {
    return {
      kind: 'apply',
      level: requested,
      reason: `WARN: weakened below minimum (${minRequired}) via force=true`,
    }
  }

  return {
    kind: 'reject',
    reason: `requested sandbox "${requested}" is below minimum "${minRequired}" for declared effects`,
  }
}

export interface SandboxRuntime {
  readonly level: SandboxLevel
  readonly name: string
  spawn(opts: { command: string; args: readonly string[]; cwd?: string }): Promise<{
    pid: number
    kill: () => Promise<void>
  }>
}

export const ToolManifest = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  sideEffects: z.array(z.enum(['none', 'read', 'write', 'destructive', 'external'])).min(1).max(5),
  minSandbox: SandboxLevel.optional(),
  description: z.string().max(1024).optional(),
})
export type ToolManifest = z.infer<typeof ToolManifest>

export const parseToolManifest = (input: unknown): ToolManifest => ToolManifest.parse(input)
export const safeParseToolManifest = (input: unknown) => ToolManifest.safeParse(input)
