// Per #236 — workspace migration bundle: move workspace between machines/cloud.
// Pure: builder + verifier for an opaque transfer envelope. Storage layer
// (file, tar, cloud blob) is a caller concern.

import type { AgentConfig } from '../schema/agent.js'
import type { FlowConfig } from '../schema/flow.js'
import type { TriggerConfig } from '../schema/trigger.js'
import type { WorkspaceConfig } from '../schema/workspace.js'
import { sha256Hex } from '../audit/sha256.js'

export type WorkspaceBundle = {
  readonly schemaVersion: '1.0'
  readonly workspace: WorkspaceConfig
  readonly agents: readonly AgentConfig[]
  readonly flows: readonly FlowConfig[]
  readonly triggers: readonly TriggerConfig[]
  readonly templates: readonly { readonly id: string; readonly content: unknown }[]
  /** Hex SHA-256 over the canonical body; integrity check on import. */
  readonly integrity: string
  readonly exportedAt: string
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value as Record<string, unknown>).sort()
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
  return `{${parts.join(',')}}`
}

const canonicalBody = (
  args: Pick<WorkspaceBundle, 'workspace' | 'agents' | 'flows' | 'triggers' | 'templates'>,
): string =>
  stableStringify({
    workspace: args.workspace,
    agents: args.agents,
    flows: args.flows,
    triggers: args.triggers,
    templates: args.templates,
  })

/**
 * Build a workspace migration bundle (#236). Pure: integrity hash is over
 * the canonical body, not the timestamp, so re-exporting an unchanged
 * workspace produces the same hash.
 */
export const buildWorkspaceBundle = async (
  args: Pick<WorkspaceBundle, 'workspace' | 'agents' | 'flows' | 'triggers' | 'templates'> & {
    readonly clock?: () => string
  },
): Promise<WorkspaceBundle> => {
  const integrity = await sha256Hex(canonicalBody(args))
  const exportedAt = (args.clock ?? (() => new Date().toISOString()))()
  return {
    schemaVersion: '1.0',
    workspace: args.workspace,
    agents: args.agents,
    flows: args.flows,
    triggers: args.triggers,
    templates: args.templates,
    integrity,
    exportedAt,
  }
}

export type BundleVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'integrity_mismatch'; readonly expected: string; readonly actual: string }

/** Verify a bundle's integrity hash against its canonical body (#236). */
export const verifyWorkspaceBundle = async (bundle: WorkspaceBundle): Promise<BundleVerdict> => {
  const recomputed = await sha256Hex(canonicalBody(bundle))
  if (recomputed.toLowerCase() !== bundle.integrity.toLowerCase()) {
    return { ok: false, reason: 'integrity_mismatch', expected: bundle.integrity, actual: recomputed }
  }
  return { ok: true }
}
