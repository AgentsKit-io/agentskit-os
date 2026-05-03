/**
 * Workspace types — shared type definitions for workspace switcher feature.
 */

export type WorkspaceStatus = 'idle' | 'running' | 'error' | 'paused'

export type Workspace = {
  /** Unique stable identifier. */
  readonly id: string
  /** Human-readable display name. */
  readonly name: string
  /** Current operational status of the workspace. */
  readonly status: WorkspaceStatus
  /** Optional description shown in the switcher. */
  readonly description?: string
}
