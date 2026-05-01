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
