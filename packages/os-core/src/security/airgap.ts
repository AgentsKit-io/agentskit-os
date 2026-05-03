// Air-gap mode enforcement per ADR-0010 / issue #184. Pure decision logic — no I/O.

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Policy schema (extends CloudSyncConfig.airGapped; self-contained here for
// consumers that want the helper without the full cloud schema)
// ---------------------------------------------------------------------------

export const AirGapPolicy = z.object({
  /** When true, deny all external network categories. */
  airGapped: z.boolean().default(false),
  /**
   * Providers whose inference runs locally and are therefore allowed even in
   * air-gap mode. Matched case-insensitively against the request provider string.
   * Default: empty (deny all external LLM providers when air-gapped).
   */
  localProviders: z.array(z.string().min(1).max(128)).max(64).default([]),
})
export type AirGapPolicy = z.infer<typeof AirGapPolicy>

export const parseAirGapPolicy = (input: unknown): AirGapPolicy => AirGapPolicy.parse(input)
export const safeParseAirGapPolicy = (input: unknown) => AirGapPolicy.safeParse(input)

// ---------------------------------------------------------------------------
// Request discriminated union
// ---------------------------------------------------------------------------

export type AirGapRequest =
  | { kind: 'telemetry' }
  | { kind: 'marketplace' }
  | { kind: 'cloudSync' }
  | { kind: 'externalLlm'; provider: string }
  | { kind: 'egress'; host: string }

// ---------------------------------------------------------------------------
// Decision type
// ---------------------------------------------------------------------------

export type AirGapDecision =
  | { allow: true }
  | { allow: false; reason: string; code: 'os.security.airgap_blocked' }

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '::1'])

/**
 * Decide whether the given request is permitted under `policy`.
 *
 * - `policy.airGapped === false` → all requests are allowed.
 * - `policy.airGapped === true`:
 *   - `telemetry`, `marketplace`, `cloudSync` → always deny.
 *   - `externalLlm` → deny unless `provider` (case-insensitive) is in
 *     `policy.localProviders`.
 *   - `egress` → deny unless `host` is a loopback address
 *     (`localhost`, `127.0.0.1`, `::1`).
 */
export const airGapEnforce = (
  policy: AirGapPolicy,
  request: AirGapRequest,
): AirGapDecision => {
  if (!policy.airGapped) {
    return { allow: true }
  }

  switch (request.kind) {
    case 'telemetry':
      return {
        allow: false,
        code: 'os.security.airgap_blocked',
        reason: 'air-gap mode: telemetry is disabled',
      }

    case 'marketplace':
      return {
        allow: false,
        code: 'os.security.airgap_blocked',
        reason: 'air-gap mode: marketplace access is disabled',
      }

    case 'cloudSync':
      return {
        allow: false,
        code: 'os.security.airgap_blocked',
        reason: 'air-gap mode: cloud sync is disabled',
      }

    case 'externalLlm': {
      const providerLower = request.provider.toLowerCase()
      const isLocal = policy.localProviders.some(
        (p) => p.toLowerCase() === providerLower,
      )
      if (isLocal) {
        return { allow: true }
      }
      return {
        allow: false,
        code: 'os.security.airgap_blocked',
        reason: `air-gap mode: external LLM provider "${request.provider}" is not in localProviders allowlist`,
      }
    }

    case 'egress': {
      if (LOOPBACK_HOSTS.has(request.host)) {
        return { allow: true }
      }
      return {
        allow: false,
        code: 'os.security.airgap_blocked',
        reason: `air-gap mode: egress to host "${request.host}" is not permitted (only loopback allowed)`,
      }
    }
  }
}
