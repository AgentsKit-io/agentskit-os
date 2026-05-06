// Per #337 — minimal HITL inbox primitives (pure; no I/O).

import { z } from 'zod'

export const HitlDecision = z.enum(['approved', 'rejected'])
export type HitlDecision = z.infer<typeof HitlDecision>

export const HitlTaskStatus = z.enum(['open', 'approved', 'rejected'])
export type HitlTaskStatus = z.infer<typeof HitlTaskStatus>

export const HitlTask = z.object({
  schemaVersion: z.literal(1).default(1),
  id: z.string().min(1).max(128),
  createdAt: z.string().min(1).max(64),
  /** Human-facing question/prompt. */
  prompt: z.string().min(1).max(8_000),
  /** Optional list of approver identifiers; empty means any operator. */
  approvers: z.array(z.string().min(1).max(128)).max(64).default([]),
  quorum: z.number().int().min(1).max(16).default(1),
  status: HitlTaskStatus.default('open'),
  resolvedAt: z.string().min(1).max(64).optional(),
  resolvedBy: z.string().min(1).max(128).optional(),
  decision: HitlDecision.optional(),
  note: z.string().max(8_000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(64).default([]),
})
export type HitlTask = z.infer<typeof HitlTask>

export type HitlInbox = {
  readonly list: (status?: HitlTaskStatus) => readonly HitlTask[]
  readonly get: (id: string) => HitlTask | undefined
  readonly enqueue: (task: Omit<HitlTask, 'status'> & { status?: HitlTaskStatus }) => HitlTask
  readonly decide: (args: {
    readonly id: string
    readonly by: string
    readonly decision: HitlDecision
    readonly note?: string
    readonly at?: string
  }) => HitlTask
}

const now = (): string => new Date().toISOString()

export const createInMemoryHitlInbox = (): HitlInbox => {
  const byId = new Map<string, HitlTask>()

  const list = (status?: HitlTaskStatus): readonly HitlTask[] => {
    const all = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    if (!status) return all
    return all.filter((t) => t.status === status)
  }

  const get = (id: string): HitlTask | undefined => byId.get(id)

  const enqueue: HitlInbox['enqueue'] = (raw) => {
    const task = HitlTask.parse({
      ...raw,
      status: raw.status ?? 'open',
    })
    byId.set(task.id, task)
    return task
  }

  const decide: HitlInbox['decide'] = (args) => {
    const existing = byId.get(args.id)
    if (!existing) throw new Error(`HITL task not found: ${args.id}`)
    if (existing.status !== 'open') return existing
    const resolvedAt = args.at ?? now()
    const next: HitlTask = {
      ...existing,
      status: args.decision === 'approved' ? 'approved' : 'rejected',
      resolvedAt,
      resolvedBy: args.by,
      decision: args.decision,
      ...(args.note !== undefined ? { note: args.note } : {}),
    }
    byId.set(next.id, next)
    return next
  }

  return { list, get, enqueue, decide }
}

