import { z } from 'zod'

export const Slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, {
    message: 'must be lowercase alphanumeric with optional hyphens (slug-style)',
  })
export type Slug = z.infer<typeof Slug>

export const Tag = z.string().min(1).max(32)
export type Tag = z.infer<typeof Tag>

export const TagList = z.array(Tag).max(32)
export type TagList = z.infer<typeof TagList>

export const VaultSecretRef = z.string().regex(/^\$\{vault:[a-z0-9_]+\}$/, {
  message: 'must be of the form ${vault:key} with lowercase alphanumeric/underscore key',
})
export type VaultSecretRef = z.infer<typeof VaultSecretRef>

/**
 * A reference to a Git repository including an optional worktree checkout path.
 * Accepts both HTTPS and SSH-style git URLs.
 */
export const RepoRef = z.object({
  /** Git URL — https:// or ssh/scp-style (git@host:org/repo.git) */
  url: z.string().url(),
  /** Branch name, tag, or full/abbreviated SHA */
  ref: z.string().min(1).max(255),
  /** Optional path to a sub-directory or worktree checkout location */
  worktreePath: z.string().max(1024).optional(),
})
export type RepoRef = z.infer<typeof RepoRef>

export const parseRepoRef = (input: unknown): RepoRef => RepoRef.parse(input)
export const safeParseRepoRef = (input: unknown) => RepoRef.safeParse(input)
