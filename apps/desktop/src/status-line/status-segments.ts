/**
 * status-segments — registry of all built-in status bar segments.
 *
 * Eight segments:
 *   workspace       — current workspace name
 *   run-mode        — sidecar run mode (real | preview | dry_run | sandbox)
 *   sidecar-status  — sidecar connection indicator
 *   active-runs     — count of currently active agent runs
 *   cost-24h        — total LLM cost accumulated in the past 24 hours
 *   notifications   — unread notification count
 *   theme           — name of the active UI theme
 *   time            — current clock (HH:MM)
 *
 * Pure data — no React state. Renderers are pure functions of StatusContext.
 */

import type { StatusSegment } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function padTwo(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatTime(date: Date): string {
  return `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`
}

function formatCost(usd: number): string {
  if (usd < 0.01) return '$0.00'
  if (usd < 10) return `$${usd.toFixed(2)}`
  return `$${usd.toFixed(0)}`
}

const RUN_MODE_LABEL: Record<string, string> = {
  real: 'Real',
  preview: 'Preview',
  dry_run: 'Dry run',
  sandbox: 'Sandbox',
}

const SIDECAR_DOT: Record<string, string> = {
  connected: '●',
  disconnected: '○',
  error: '✕',
}

// ---------------------------------------------------------------------------
// Built-in segments (ordered as the initial default)
// ---------------------------------------------------------------------------

export const BUILT_IN_SEGMENTS: readonly StatusSegment[] = [
  {
    id: 'workspace',
    label: 'Workspace name',
    render: (ctx) => ctx.workspaceName ?? '—',
  },
  {
    id: 'run-mode',
    label: 'Run mode',
    render: (ctx) => RUN_MODE_LABEL[ctx.runMode] ?? ctx.runMode,
  },
  {
    id: 'sidecar-status',
    label: 'Sidecar status',
    render: (ctx) => {
      const dot = SIDECAR_DOT[ctx.sidecarStatus] ?? '?'
      const label =
        ctx.sidecarStatus === 'connected'
          ? 'Connected'
          : ctx.sidecarStatus === 'error'
            ? 'Error'
            : 'Offline'
      return `${dot} ${label}`
    },
  },
  {
    id: 'active-runs',
    label: 'Active runs',
    render: (ctx) =>
      ctx.activeRuns === 0
        ? 'No active runs'
        : ctx.activeRuns === 1
          ? '1 run active'
          : `${ctx.activeRuns} runs active`,
  },
  {
    id: 'cost-24h',
    label: 'Cost (24 h)',
    render: (ctx) => `${formatCost(ctx.cost24h)} / 24 h`,
  },
  {
    id: 'notifications',
    label: 'Unread notifications',
    render: (ctx) =>
      ctx.unreadNotifications === 0
        ? 'No notifications'
        : ctx.unreadNotifications === 1
          ? '1 notification'
          : `${ctx.unreadNotifications} notifications`,
  },
  {
    id: 'theme',
    label: 'Current theme',
    render: (ctx) => ctx.theme,
  },
  {
    id: 'time',
    label: 'Time',
    render: (ctx) => formatTime(ctx.now),
  },
]

/** The ordered list of segment ids shown by default. */
export const DEFAULT_VISIBLE_IDS: readonly string[] = BUILT_IN_SEGMENTS.map((s) => s.id)

/** Look up a segment by id. Returns undefined when the id is not registered. */
export function getSegmentById(id: string): StatusSegment | undefined {
  return BUILT_IN_SEGMENTS.find((s) => s.id === id)
}
