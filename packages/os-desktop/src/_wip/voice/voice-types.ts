/**
 * voice-types — Zod schemas and TypeScript types for voice mode.
 *
 * VoiceState: the lifecycle state of the speech recognition session.
 * VoiceTranscript: a single recognised utterance (may be interim or final).
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// VoiceState
// ---------------------------------------------------------------------------

export const VoiceStateSchema = z.enum(['idle', 'listening', 'processing', 'error'])

export type VoiceState = z.infer<typeof VoiceStateSchema>

// ---------------------------------------------------------------------------
// VoiceTranscript
// ---------------------------------------------------------------------------

export const VoiceTranscriptSchema = z.object({
  /** Stable id for deduplication / keying in React lists. */
  id: z.string(),
  /** Recognised text (may be interim). */
  text: z.string(),
  /** True once the recognition engine has finalised this result. */
  finalized: z.boolean(),
  /** ISO-8601 timestamp of when this transcript started. */
  startedAt: z.string(),
})

export type VoiceTranscript = z.infer<typeof VoiceTranscriptSchema>
