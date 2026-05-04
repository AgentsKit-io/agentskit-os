// Per ROADMAP M3 (#66). Envelope + signature for portable flow JSON.
// Forward-compat: format string includes schema version. Optional
// signature field carries a detached signature over the canonical body.

import { z } from 'zod'
import { FlowConfig } from './flow.js'

export const FLOW_ENVELOPE_FORMAT = 'agentskit-os/flow@1' as const

export const FlowEnvelopeSignature = z.object({
  algorithm: z.enum(['ed25519', 'minisign']),
  /** Base64-encoded public key. */
  publicKey: z.string().min(1).max(2048),
  /** Base64-encoded signature over the canonicalized FlowConfig body. */
  signature: z.string().min(1).max(4096),
  /** Optional human note: who signed, when, for what purpose. */
  note: z.string().max(2048).optional(),
})
export type FlowEnvelopeSignature = z.infer<typeof FlowEnvelopeSignature>

export const FlowEnvelope = z.object({
  format: z.literal(FLOW_ENVELOPE_FORMAT),
  flow: FlowConfig,
  signature: FlowEnvelopeSignature.optional(),
  /** Free-form metadata an exporter can attach (e.g. source version). */
  meta: z.record(z.string().min(1).max(64), z.unknown()).optional(),
})
export type FlowEnvelope = z.infer<typeof FlowEnvelope>

export const parseFlowEnvelope = (input: unknown): FlowEnvelope =>
  FlowEnvelope.parse(input)
export const safeParseFlowEnvelope = (input: unknown) =>
  FlowEnvelope.safeParse(input)

/**
 * Stable serialization of a flow body for hashing/signing. Sorts keys
 * recursively so the same flow always produces the same canonical bytes.
 */
export const canonicalFlowBody = (flow: FlowEnvelope['flow']): string => {
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys)
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(obj).sort()) out[k] = sortKeys(obj[k])
      return out
    }
    return v
  }
  return JSON.stringify(sortKeys(flow))
}
