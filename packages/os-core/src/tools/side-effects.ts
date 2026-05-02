// Per ADR-0010. Tool side-effect taxonomy + RunMode × SideEffect policy.

import { z } from 'zod'
import type { RunMode } from '../runtime/run-mode.js'

export const SIDE_EFFECTS = ['none', 'read', 'write', 'destructive', 'external'] as const
export type SideEffect = (typeof SIDE_EFFECTS)[number]
export const SideEffect = z.enum(SIDE_EFFECTS)

export const SideEffectList = z
  .array(SideEffect)
  .min(1)
  .max(SIDE_EFFECTS.length)
export type SideEffectList = z.infer<typeof SideEffectList>

const SEVERITY: Record<SideEffect, number> = {
  none: 0,
  read: 1,
  write: 2,
  external: 3,
  destructive: 4,
}

export const maxSeverity = (effects: readonly SideEffect[]): SideEffect => {
  if (effects.length === 0) return 'external' // default to most restrictive
  let worst: SideEffect = effects[0]!
  for (const e of effects) {
    if (SEVERITY[e] > SEVERITY[worst]) worst = e
  }
  return worst
}

export type ModeAction =
  | 'run'
  | 'run-with-audit'
  | 'run-with-audit-and-egress-check'
  | 'block'
  | 'stub'
  | 'replay'
  | 'replay-no-op'
  | 'mocked'
  | 'run-require-fixture'

const POLICY: Record<RunMode, Record<SideEffect, ModeAction>> = {
  real: {
    none: 'run',
    read: 'run',
    write: 'run',
    destructive: 'run-with-audit',
    external: 'run-with-audit-and-egress-check',
  },
  preview: {
    none: 'run',
    read: 'run',
    write: 'block',
    destructive: 'block',
    external: 'block',
  },
  dry_run: {
    none: 'stub',
    read: 'stub',
    write: 'stub',
    destructive: 'stub',
    external: 'stub',
  },
  replay: {
    none: 'replay',
    read: 'replay',
    write: 'replay-no-op',
    destructive: 'replay-no-op',
    external: 'replay-no-op',
  },
  simulate: {
    none: 'mocked',
    read: 'mocked',
    write: 'mocked',
    destructive: 'mocked',
    external: 'mocked',
  },
  deterministic: {
    none: 'run',
    read: 'run',
    write: 'run',
    destructive: 'run-require-fixture',
    external: 'run-require-fixture',
  },
}

export const decideToolAction = (
  mode: RunMode,
  effects: readonly SideEffect[],
): { action: ModeAction; severity: SideEffect } => {
  const severity = maxSeverity(effects)
  return { action: POLICY[mode][severity], severity }
}
