// Phase A-1 — workspace loader for the desktop sidecar + headless runners.
// Reads a workspace config file (yaml | json) from disk, parses through
// `parseWorkspaceConfig`, and surfaces a typed `LoadedWorkspace` envelope
// the sidecar / CLI consume to bootstrap the runner without a hardcoded
// dry-run stub.

import { readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import YAML from 'yaml'
import { parseWorkspaceConfig, type WorkspaceConfig } from '@agentskit/os-core'

export type LoadedWorkspace = {
  /** Absolute path the loader resolved. */
  readonly source: string
  readonly workspace: WorkspaceConfig
  /** Provider keys / connection refs the loader pulled from the file. */
  readonly secrets: Readonly<Record<string, string>>
  /** Free-form per-section blobs (agents/flows/triggers) the runner will register. */
  readonly inline: {
    readonly agents: readonly unknown[]
    readonly flows: readonly unknown[]
    readonly triggers: readonly unknown[]
  }
}

export type LoadWorkspaceOpts = {
  /** Override the discovery path; otherwise checks env then $HOME default. */
  readonly path?: string
}

const ENV_VAR = 'AGENTSKIT_WORKSPACE'
const DEFAULT_REL = '.agentskitos/workspace.yaml'

const fileExists = async (p: string): Promise<boolean> => {
  try {
    const s = await stat(p)
    return s.isFile()
  } catch {
    return false
  }
}

const candidatePaths = (opts: LoadWorkspaceOpts): readonly string[] => {
  const out: string[] = []
  if (opts.path !== undefined) out.push(resolve(opts.path))
  const fromEnv = process.env[ENV_VAR]
  if (fromEnv !== undefined && fromEnv.length > 0) out.push(resolve(fromEnv))
  out.push(join(homedir(), DEFAULT_REL))
  out.push(join(homedir(), '.agentskitos/workspace.json'))
  return out
}

export const resolveWorkspacePath = async (opts: LoadWorkspaceOpts = {}): Promise<string | undefined> => {
  for (const p of candidatePaths(opts)) {
    if (await fileExists(p)) return p
  }
  return undefined
}

const parseDoc = (raw: string, path: string): unknown => {
  if (path.endsWith('.json')) return JSON.parse(raw)
  return YAML.parse(raw)
}

const asArray = (v: unknown): readonly unknown[] =>
  Array.isArray(v) ? v : []

const asRecord = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}

/**
 * Load a workspace config from disk. Throws when the file is found but
 * malformed; returns `null` when no candidate path resolves.
 */
export const loadWorkspaceConfig = async (
  opts: LoadWorkspaceOpts = {},
): Promise<LoadedWorkspace | null> => {
  const source = await resolveWorkspacePath(opts)
  if (source === undefined) return null
  const raw = await readFile(source, 'utf8')
  const parsed = asRecord(parseDoc(raw, source))
  const workspaceInput = parsed['workspace'] ?? parsed
  const workspace = parseWorkspaceConfig(workspaceInput)
  const secretsBlock = asRecord(parsed['secrets'])
  const secrets: Record<string, string> = {}
  for (const [k, v] of Object.entries(secretsBlock)) {
    if (typeof v === 'string') secrets[k] = v
  }
  return {
    source,
    workspace,
    secrets,
    inline: {
      agents: asArray(parsed['agents']),
      flows: asArray(parsed['flows']),
      triggers: asArray(parsed['triggers']),
    },
  }
}
