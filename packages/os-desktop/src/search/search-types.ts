/**
 * Search types — shared type definitions for the global fuzzy search overlay (D-11).
 *
 * `SearchEntity` is the universal search result shape. Each entity has a kind
 * that determines its grouping in the overlay, and a `run` callback that is
 * invoked when the user activates the result (Enter / click).
 */

export type SearchEntityKind =
  | 'workspace'
  | 'agent'
  | 'flow'
  | 'run'
  | 'trace'
  | 'command'
  | 'doc'

export type SearchEntity = {
  /** Globally unique identifier within the result set. */
  readonly id: string
  /** Category used for grouping in the overlay. */
  readonly kind: SearchEntityKind
  /** Primary display text. */
  readonly label: string
  /** Optional secondary text (shown below the label). */
  readonly subtitle?: string
  /** Called when the user activates this result. */
  readonly run: () => void
}

/** Human-readable labels for each kind — used as group headings. */
export const KIND_LABELS: Record<SearchEntityKind, string> = {
  workspace: 'Workspaces',
  agent: 'Agents',
  flow: 'Flows',
  run: 'Recent Runs',
  trace: 'Traces',
  command: 'Commands',
  doc: 'Docs',
}

/** Display order of kinds in the grouped result list. */
export const KIND_ORDER: readonly SearchEntityKind[] = [
  'command',
  'workspace',
  'flow',
  'agent',
  'run',
  'trace',
  'doc',
]
