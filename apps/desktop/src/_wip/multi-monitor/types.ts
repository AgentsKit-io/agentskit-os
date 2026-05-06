/**
 * Multi-monitor types — D-12.
 *
 * Zod schemas + inferred TypeScript types for MonitorInfo (returned by the
 * Rust `list_monitors` command) and WindowLayout (persisted per-purpose in
 * localStorage).
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// MonitorInfo
// ---------------------------------------------------------------------------

export const MonitorInfoSchema = z.object({
  /** Opaque stable identifier (index-based string from Tauri). */
  id: z.string(),
  /** Human-readable display name supplied by the OS. */
  name: z.string(),
  /** Top-left X position in logical pixels. */
  x: z.number().int(),
  /** Top-left Y position in logical pixels. */
  y: z.number().int(),
  /** Width in logical pixels. */
  width: z.number().int().positive(),
  /** Height in logical pixels. */
  height: z.number().int().positive(),
  /** Device-pixel ratio. */
  scaleFactor: z.number().positive(),
})

export type MonitorInfo = z.infer<typeof MonitorInfoSchema>

// ---------------------------------------------------------------------------
// WindowLayout
// ---------------------------------------------------------------------------

/**
 * Persisted placement for a window purpose.
 *
 * Stored under the key `agentskitos.windows` in localStorage as a JSON map
 * of `purpose → WindowLayout`.
 */
export const WindowLayoutSchema = z.object({
  /** Monitor id where the window was last placed. */
  monitorId: z.string(),
  /** Last X position (logical pixels). */
  x: z.number().int(),
  /** Last Y position (logical pixels). */
  y: z.number().int(),
  /** Last width (logical pixels). */
  w: z.number().int().positive(),
  /** Last height (logical pixels). */
  h: z.number().int().positive(),
})

export type WindowLayout = z.infer<typeof WindowLayoutSchema>

/**
 * The map stored in localStorage.
 * key = window purpose string, value = persisted layout.
 */
export const WindowLayoutMapSchema = z.record(z.string(), WindowLayoutSchema)

export type WindowLayoutMap = z.infer<typeof WindowLayoutMapSchema>

// ---------------------------------------------------------------------------
// Purpose constants
// ---------------------------------------------------------------------------

export const WINDOW_PURPOSES = ['dashboard', 'traces', 'trace-detail'] as const

export type WindowPurpose = (typeof WINDOW_PURPOSES)[number]
