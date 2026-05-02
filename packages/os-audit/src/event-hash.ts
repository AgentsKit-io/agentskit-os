// Pure helper to hash an OsEvent into the SignedEventRef shape required
// by AuditBatch. Uses canonicalJson + sha256 from os-core.

import type { AnyEvent } from '@agentskit/os-core'
import { canonicalJson, sha256OfCanonical } from '@agentskit/os-core/lockfile/lock'

export type SignedEventRef = {
  readonly eventId: string
  readonly eventHash: string
}

const stripPrefix = (h: string): string => h.replace(/^sha256:/, '')

export const hashEvent = async (event: AnyEvent): Promise<SignedEventRef> => {
  const canonical = canonicalJson(event)
  const prefixed = await sha256OfCanonical(canonical)
  return { eventId: event.id, eventHash: stripPrefix(prefixed) }
}
