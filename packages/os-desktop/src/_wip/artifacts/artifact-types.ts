/**
 * Artifact type definitions (U-7).
 *
 * All runtime-validated via Zod at ingestion boundaries.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// ArtifactKind
// ---------------------------------------------------------------------------

export const ArtifactKindSchema = z.enum([
  'code',
  'json',
  'yaml',
  'csv',
  'svg',
  'mermaid',
  'html',
  'markdown',
  'image',
  'unknown',
])

export type ArtifactKind = z.infer<typeof ArtifactKindSchema>

// ---------------------------------------------------------------------------
// Artifact
// ---------------------------------------------------------------------------

export const ArtifactSchema = z.object({
  /** Stable ID (uuid or deterministic hash) */
  id: z.string(),
  /** Detected kind — drives renderer selection */
  kind: ArtifactKindSchema,
  /** MIME type as reported by the producer; may be empty string */
  mime: z.string(),
  /** Raw string content (data URL for images, raw text otherwise) */
  content: z.string(),
  /** Optional display name */
  name: z.string().optional(),
})

export type Artifact = z.infer<typeof ArtifactSchema>
