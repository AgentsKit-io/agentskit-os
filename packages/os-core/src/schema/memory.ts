import { z } from 'zod'
import { VaultSecretRef } from './_primitives.js'

const SecretOrPlain = z.union([VaultSecretRef, z.string().min(1).max(2048)])

const Common = {
  maxMessages: z.number().int().positive().max(100_000).optional(),
  ttlSeconds: z.number().int().positive().max(31_536_000).optional(),
}

export const InMemoryStore = z.object({ ...Common, backend: z.literal('in-memory') })
export type InMemoryStore = z.infer<typeof InMemoryStore>

export const FileMemoryStore = z.object({
  ...Common,
  backend: z.literal('file'),
  path: z.string().min(1).max(1024),
})
export type FileMemoryStore = z.infer<typeof FileMemoryStore>

export const SqliteMemoryStore = z.object({
  ...Common,
  backend: z.literal('sqlite'),
  path: z.string().min(1).max(1024),
})
export type SqliteMemoryStore = z.infer<typeof SqliteMemoryStore>

export const RedisMemoryStore = z.object({
  ...Common,
  backend: z.literal('redis'),
  url: SecretOrPlain,
  prefix: z.string().min(1).max(64).default('agentskitos:'),
})
export type RedisMemoryStore = z.infer<typeof RedisMemoryStore>

export const VectorMemoryStore = z.object({
  ...Common,
  backend: z.literal('vector'),
  provider: z.enum(['lancedb', 'pgvector', 'qdrant', 'pinecone', 'weaviate']),
  connection: SecretOrPlain.optional(),
  collection: z.string().min(1).max(128),
  dimensions: z.number().int().positive().max(8192),
  embeddings: z.object({
    provider: z.string().min(1).max(64),
    model: z.string().min(1).max(128),
  }),
})
export type VectorMemoryStore = z.infer<typeof VectorMemoryStore>

export const LocalStorageMemoryStore = z.object({
  ...Common,
  backend: z.literal('localstorage'),
  key: z.string().min(1).max(128).default('agentskitos:memory'),
})
export type LocalStorageMemoryStore = z.infer<typeof LocalStorageMemoryStore>

export const MemoryConfig = z.discriminatedUnion('backend', [
  InMemoryStore,
  FileMemoryStore,
  SqliteMemoryStore,
  RedisMemoryStore,
  VectorMemoryStore,
  LocalStorageMemoryStore,
])
export type MemoryConfig = z.infer<typeof MemoryConfig>

export const parseMemoryConfig = (input: unknown): MemoryConfig => MemoryConfig.parse(input)
export const safeParseMemoryConfig = (input: unknown) => MemoryConfig.safeParse(input)
