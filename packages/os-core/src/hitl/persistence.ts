// Per #62 — HITL inbox persistence helpers.
// Pure: serialize/restore the inbox state so the desktop can survive a
// reload without losing pending tasks. Storage layer (file, vault, cloud)
// is left to the caller; this module only handles canonical (de)serialization.

import { z } from 'zod'
import { HitlTask, type HitlInbox, createInMemoryHitlInbox } from './inbox.js'

export const HitlInboxSnapshot = z.object({
  schemaVersion: z.literal(1).default(1),
  capturedAt: z.string().min(1).max(64),
  tasks: z.array(HitlTask).max(100_000),
})
export type HitlInboxSnapshot = z.infer<typeof HitlInboxSnapshot>

/** Serialize the current inbox state into a deterministic snapshot (#62). */
export const snapshotHitlInbox = (
  inbox: HitlInbox,
  opts: { readonly clock?: () => string } = {},
): HitlInboxSnapshot => {
  const now = opts.clock ?? (() => new Date().toISOString())
  return HitlInboxSnapshot.parse({
    schemaVersion: 1,
    capturedAt: now(),
    tasks: [...inbox.list()],
  })
}

/** Build a fresh in-memory inbox seeded from a snapshot (#62). */
export const restoreHitlInbox = (snapshot: unknown): HitlInbox => {
  const parsed = HitlInboxSnapshot.parse(snapshot)
  const inbox = createInMemoryHitlInbox()
  for (const task of parsed.tasks) {
    inbox.enqueue(task)
  }
  return inbox
}

export const parseHitlInboxSnapshot = (input: unknown): HitlInboxSnapshot =>
  HitlInboxSnapshot.parse(input)

export const safeParseHitlInboxSnapshot = (input: unknown) =>
  HitlInboxSnapshot.safeParse(input)
