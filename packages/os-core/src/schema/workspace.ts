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

/**
 * Data residency configuration for a workspace.
 * Controls where storage, LLM, and audit data physically resides.
 * Error code: os.config.invalid_data_residency
 */
export const DataResidencyConfig = z.object({
  /** ISO 3166-1 alpha-2 / alpha-3 country code, or one of the macro-regions */
  region: z.string().min(2).max(8),
  /** When true, all storage, LLM, and audit adapters MUST reside in region */
  pinned: z.boolean().default(false),
  /** Tool or adapter IDs that are explicitly allowed to operate outside region */
  exemptions: z.array(z.string().min(1).max(128)).optional(),
})
export type DataResidencyConfig = z.infer<typeof DataResidencyConfig>

export const WorkspaceConfig = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: Slug,
  name: z.string().min(1).max(128),
  isolation: WorkspaceIsolation.default('strict'),
  dataDir: z.string().min(1).optional(),
  description: z.string().max(512).optional(),
  tags: TagList.default([]),
  limits: WorkspaceLimits.optional(),
  dataResidency: DataResidencyConfig.optional(),
})

export type WorkspaceConfig = z.infer<typeof WorkspaceConfig>

export const parseWorkspaceConfig = (input: unknown): WorkspaceConfig =>
  WorkspaceConfig.parse(input)

export const safeParseWorkspaceConfig = (input: unknown) =>
  WorkspaceConfig.safeParse(input)

export const parseWorkspaceLimits = (input: unknown): WorkspaceLimits =>
  WorkspaceLimits.parse(input)
export const safeParseWorkspaceLimits = (input: unknown) => WorkspaceLimits.safeParse(input)
