import { z } from 'zod'
import { Slug, TagList } from './_primitives.js'

export const SCHEMA_VERSION = 1 as const

export const WorkspaceIsolation = z.enum(['strict', 'shared'])
export type WorkspaceIsolation = z.infer<typeof WorkspaceIsolation>

export const WorkspaceLimits = z.object({
  tokensPerRun: z.number().int().positive().max(100_000_000).optional(),
  usdPerRun: z.number().nonnegative().max(1_000_000).optional(),
  tokensPerDay: z.number().int().positive().max(10_000_000_000).optional(),
  usdPerDay: z.number().nonnegative().max(10_000_000).optional(),
  wallClockMsPerRun: z.number().int().positive().max(86_400_000).optional(),
  maxConcurrentRuns: z.number().int().positive().max(10_000).optional(),
  maxStepsPerRun: z.number().int().positive().max(100_000).optional(),
})
export type WorkspaceLimits = z.infer<typeof WorkspaceLimits>

export const WorkspaceConfig = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: Slug,
  name: z.string().min(1).max(128),
  isolation: WorkspaceIsolation.default('strict'),
  dataDir: z.string().min(1).optional(),
  description: z.string().max(512).optional(),
  tags: TagList.default([]),
  limits: WorkspaceLimits.optional(),
})

export type WorkspaceConfig = z.infer<typeof WorkspaceConfig>

export const parseWorkspaceConfig = (input: unknown): WorkspaceConfig =>
  WorkspaceConfig.parse(input)

export const safeParseWorkspaceConfig = (input: unknown) =>
  WorkspaceConfig.safeParse(input)

export const parseWorkspaceLimits = (input: unknown): WorkspaceLimits =>
  WorkspaceLimits.parse(input)
export const safeParseWorkspaceLimits = (input: unknown) => WorkspaceLimits.safeParse(input)
