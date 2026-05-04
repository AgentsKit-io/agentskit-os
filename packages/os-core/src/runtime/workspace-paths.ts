// Per ROADMAP M-5 (#126). Pure path resolver — no I/O.
// Computes isolated runtime locations for a workspace's vault, traces,
// sqlite, checkpoints, and secrets cache. Honors WorkspaceConfig.isolation
// and dataDir. Strict mode namespaces under workspace.id; shared mode is flat.

import type { WorkspaceConfig } from '../schema/workspace.js'

export type WorkspacePaths = {
  readonly root: string
  readonly vault: string
  readonly traces: string
  readonly sqlite: string
  readonly checkpoints: string
  readonly secrets: string
}

export type ResolveWorkspacePathsOptions = {
  /** Project root (where agentskit-os.config.ts lives). */
  readonly projectDir?: string
  /** AGENTSKITOS_HOME equivalent — global override. */
  readonly home?: string
  /** OS user home (`~`). Required when projectDir is not provided. */
  readonly userHome?: string
  /** Path join — defaults to posix-style. Inject node:path.join for OS-correct separators. */
  readonly join?: (...segments: string[]) => string
}

const posixJoin = (...segments: string[]): string => {
  const parts: string[] = []
  for (const seg of segments) {
    if (!seg) continue
    for (const piece of seg.split('/')) {
      if (!piece || piece === '.') continue
      if (piece === '..') {
        if (parts.length > 0) parts.pop()
        continue
      }
      parts.push(piece)
    }
  }
  const leading = segments.length > 0 && segments[0]?.startsWith('/') ? '/' : ''
  return leading + parts.join('/')
}

/**
 * Resolve isolated runtime paths for a workspace.
 *
 * Resolution order for the data root:
 *   1. `workspace.dataDir` (absolute or relative to projectDir)
 *   2. `options.home` (AGENTSKITOS_HOME)
 *   3. `<projectDir>/.agentskitos`
 *   4. `<userHome>/.agentskitos`
 *
 * Strict isolation appends `/workspaces/<id>`. Shared isolation does not.
 */
export const resolveWorkspacePaths = (
  workspace: WorkspaceConfig,
  options: ResolveWorkspacePathsOptions = {},
): WorkspacePaths => {
  const join = options.join ?? posixJoin
  const base = pickBase(workspace, options, join)
  const root =
    workspace.isolation === 'strict' ? join(base, 'workspaces', workspace.id) : base
  return {
    root,
    vault: join(root, 'vault'),
    traces: join(root, 'traces'),
    sqlite: join(root, 'state.sqlite'),
    checkpoints: join(root, 'checkpoints'),
    secrets: join(root, 'secrets'),
  }
}

const pickBase = (
  workspace: WorkspaceConfig,
  options: ResolveWorkspacePathsOptions,
  join: (...segments: string[]) => string,
): string => {
  if (workspace.dataDir && isAbsolute(workspace.dataDir)) return workspace.dataDir
  if (workspace.dataDir && options.projectDir) return join(options.projectDir, workspace.dataDir)
  if (workspace.dataDir && options.userHome) return join(options.userHome, workspace.dataDir)
  if (options.home) return options.home
  if (options.projectDir) return join(options.projectDir, '.agentskitos')
  if (options.userHome) return join(options.userHome, '.agentskitos')
  throw new Error(
    'os.workspace.no_base_path: cannot resolve workspace runtime root — ' +
      'pass options.projectDir, options.userHome, or options.home',
  )
}

const isAbsolute = (p: string): boolean => p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p)
