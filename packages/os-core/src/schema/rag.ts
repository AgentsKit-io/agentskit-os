import { z } from 'zod'
import { Slug, TagList, VaultSecretRef } from './_primitives.js'

const SecretOrPlain = z.union([VaultSecretRef, z.string().min(1).max(2048)])

export const ChunkStrategy = z.enum(['fixed', 'sentence', 'paragraph', 'semantic', 'markdown'])
export type ChunkStrategy = z.infer<typeof ChunkStrategy>

export const ChunkerConfig = z.object({
  strategy: ChunkStrategy.default('paragraph'),
  size: z.number().int().min(64).max(32_768).default(1024),
  overlap: z.number().int().min(0).max(8192).default(128),
})
export type ChunkerConfig = z.infer<typeof ChunkerConfig>

export const EmbeddingsConfig = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  dimensions: z.number().int().positive().max(8192),
  batchSize: z.number().int().positive().max(1024).default(64),
})
export type EmbeddingsConfig = z.infer<typeof EmbeddingsConfig>

const LoaderCommon = { id: Slug, enabled: z.boolean().default(true) }

export const FileLoader = z.object({
  ...LoaderCommon,
  kind: z.literal('file'),
  path: z.string().min(1).max(1024),
  glob: z.string().max(256).optional(),
})
export type FileLoader = z.infer<typeof FileLoader>

export const UrlLoader = z.object({
  ...LoaderCommon,
  kind: z.literal('url'),
  urls: z.array(z.string().url()).min(1).max(2048),
  recursive: z.boolean().default(false),
  maxDepth: z.number().int().min(0).max(8).default(0),
})
export type UrlLoader = z.infer<typeof UrlLoader>

export const SqlLoader = z.object({
  ...LoaderCommon,
  kind: z.literal('sql'),
  connection: SecretOrPlain,
  query: z.string().min(1).max(4096),
})
export type SqlLoader = z.infer<typeof SqlLoader>

export const ApiLoader = z.object({
  ...LoaderCommon,
  kind: z.literal('api'),
  endpoint: z.string().url(),
  headers: z.record(z.string().min(1).max(64), SecretOrPlain).optional(),
  jsonPath: z.string().max(256).optional(),
})
export type ApiLoader = z.infer<typeof ApiLoader>

export const LoaderConfig = z.discriminatedUnion('kind', [FileLoader, UrlLoader, SqlLoader, ApiLoader])
export type LoaderConfig = z.infer<typeof LoaderConfig>

export const RerankerConfig = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(['cohere', 'jina', 'voyage', 'cross-encoder', 'graph']).optional(),
  model: z.string().min(1).max(128).optional(),
  topN: z.number().int().positive().max(256).optional(),
})
export type RerankerConfig = z.infer<typeof RerankerConfig>

export const RetrieverConfig = z.object({
  topK: z.number().int().positive().max(256).default(5),
  similarityThreshold: z.number().min(0).max(1).optional(),
  hybridSearch: z.boolean().default(false),
  reranker: RerankerConfig.optional(),
})
export type RetrieverConfig = z.infer<typeof RetrieverConfig>

export const RagConfig = z.object({
  id: Slug,
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  store: z.string().min(1).max(64),
  chunker: ChunkerConfig.default(() => ChunkerConfig.parse({})),
  embeddings: EmbeddingsConfig,
  loaders: z.array(LoaderConfig).max(64).default([]),
  retriever: RetrieverConfig.default(() => RetrieverConfig.parse({})),
  tags: TagList.default([]),
})
export type RagConfig = z.infer<typeof RagConfig>

export const parseRagConfig = (input: unknown): RagConfig => RagConfig.parse(input)
export const safeParseRagConfig = (input: unknown) => RagConfig.safeParse(input)
