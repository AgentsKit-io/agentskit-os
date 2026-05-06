/**
 * types — Status line types and context.
 *
 * `StatusSegment` describes a single slot in the bottom status bar.
 * `StatusContext` carries all the live signals segments may read.
 */

import type { ReactNode } from 'react'
import type { RunMode, SidecarStatus } from '../lib/sidecar'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type StatusContext = {
  /** Name of the currently-selected workspace, or null when not yet loaded. */
  readonly workspaceName: string | null
  /** Current run mode as reported by the sidecar. */
  readonly runMode: RunMode
  /** Connection state of the sidecar process. */
  readonly sidecarStatus: SidecarStatus
  /** Number of agent runs currently active. */
  readonly activeRuns: number
  /** Total LLM cost (USD) accumulated in the last 24 hours. */
  readonly cost24h: number
  /** Number of unread notifications. */
  readonly unreadNotifications: number
  /** Current UI theme name. */
  readonly theme: string
  /** Current time as a Date object (updated each minute). */
  readonly now: Date
}

// ---------------------------------------------------------------------------
// Segment
// ---------------------------------------------------------------------------

export type StatusSegment = {
  /** Unique, stable string id for this segment (persisted to localStorage). */
  readonly id: string
  /** Human-readable label shown in the config panel. */
  readonly label: string
  /** Renders the segment content into the status bar. */
  readonly render: (ctx: StatusContext) => ReactNode
}
