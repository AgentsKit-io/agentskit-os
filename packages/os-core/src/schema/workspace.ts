import { z } from 'zod'

export const SCHEMA_VERSION = 1 as const

const slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'must be lowercase alphanumeric with optional hyphens (slug-style)',
  })

export const WorkspaceIsolation = z.enum(['strict', 'shared'])
export type WorkspaceIsolation = z.infer<typeof WorkspaceIsolation>

export const WorkspaceConfig = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: slug,
  name: z.string().min(1).max(128),
  isolation: WorkspaceIsolation.default('strict'),
  dataDir: z.string().min(1).optional(),
  description: z.string().max(512).optional(),
  tags: z.array(z.string().min(1).max(32)).max(32).default([]),
})

export type WorkspaceConfig = z.infer<typeof WorkspaceConfig>

export const parseWorkspaceConfig = (input: unknown): WorkspaceConfig =>
  WorkspaceConfig.parse(input)

export const safeParseWorkspaceConfig = (input: unknown) =>
  WorkspaceConfig.safeParse(input)
