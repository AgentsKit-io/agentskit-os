// Per #55 — one-click fork helpers for agents + workspaces.
// Pure: clones the config, swaps id + name, optionally retags. Does not touch
// the filesystem or any registry; callers wire that side-effect on top.

import type { AgentConfig } from '../schema/agent.js'
import type { WorkspaceConfig } from '../schema/workspace.js'

export type ForkOptions = {
  /** New id for the forked entity. Required. */
  readonly newId: string
  /** Optional new display name; defaults to `${original.name} (fork)`. */
  readonly newName?: string
  /** Tag added to the fork; defaults to `forked-from:<source-id>`. */
  readonly forkTag?: string
}

const buildName = (original: { name: string }, override: string | undefined): string => {
  if (override !== undefined && override.length > 0) return override
  return `${original.name} (fork)`
}

const mergeTags = (existing: readonly string[], extra: string): string[] => {
  if (existing.includes(extra)) return [...existing]
  return [...existing, extra]
}

/**
 * Fork an agent config (#55). Returns a new AgentConfig with a fresh id, a
 * forked-from tag, and a default suffix on the name. Caller is responsible
 * for persisting the fork in their registry.
 */
export const forkAgentConfig = (source: AgentConfig, opts: ForkOptions): AgentConfig => {
  const tag = opts.forkTag ?? `forked-from:${source.id}`
  return {
    ...source,
    id: opts.newId,
    name: buildName(source, opts.newName),
    tags: mergeTags(source.tags, tag),
  }
}

/**
 * Fork a workspace config (#55). Same shape as `forkAgentConfig` — id swap,
 * tag, default name suffix. Other fields are preserved verbatim so policy and
 * residency settings carry over.
 */
export const forkWorkspaceConfig = (source: WorkspaceConfig, opts: ForkOptions): WorkspaceConfig => {
  const tag = opts.forkTag ?? `forked-from:${source.id}`
  return {
    ...source,
    id: opts.newId,
    name: buildName(source, opts.newName),
    tags: mergeTags(source.tags, tag),
  }
}
