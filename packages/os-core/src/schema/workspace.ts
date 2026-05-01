import { z } from 'zod'
import { Slug, TagList } from './_primitives.js'

export const SCHEMA_VERSION = 1 as const

export const WorkspaceIsolation = z.enum(['strict', 'shared'])
export type WorkspaceIsolation = z.infer<typeof WorkspaceIsolation>

export const WorkspaceConfig = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: Slug,
  name: z.string().min(1).max(128),
  isolation: WorkspaceIsolation.default('strict'),
  dataDir: z.string().min(1).optional(),
  description: z.string().max(512).optional(),
  tags: TagList.default([]),
})

export type WorkspaceConfig = z.infer<typeof WorkspaceConfig>

export const parseWorkspaceConfig = (input: unknown): WorkspaceConfig =>
  WorkspaceConfig.parse(input)

export const safeParseWorkspaceConfig = (input: unknown) =>
  WorkspaceConfig.safeParse(input)
