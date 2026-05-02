import { z } from 'zod'
import { Slug, TagList, VaultSecretRef } from './_primitives.js'

const SecretOrPlain = z.union([VaultSecretRef, z.string().min(1).max(2048)])

export const ChunkerStrategy = z.enum(['fixed', 'recursive', 'semantic', 'sentence', 'markdown', 'code'])
export type ChunkerStrategy = z.infer<typeof ChunkerStrategy>

export const ChunkerConfig = z.object({
  strategy: ChunkerStrategy.default('recursive'),
  size: z.number().int().positive().max(32_768).default(1024),
  overlap: z.number().int().nonnegative().max(8_192).default(128),
  separators: z.array(z.string().max(64)).max(32).optional(),
})
export type ChunkerConfig = z.infer<typeof ChunkerConfig>

const LoaderFs = z.object({
  kind: z.literal('fs'),
  path: z.string().min(1).max(1024),
  glob: z.string().max(256).optional(),
  recursive: z.boolean().default(true),
})
const LoaderWeb = z.object({
  kind: z.literal('web'),
  urls: z.array(z.string().url()).min(1).max(1000),
  followLinks: z.boolean().default(false),
  maxDepth: z.number().int().nonnegative().max(10).default(0),
})
const LoaderPdf = z.object({
  kind: z.literal('pdf'),
  path: z.string().min(1).max(1024),
})
const LoaderNotion = z.object({
  kind: z.literal('notion'),
  databaseId: z.string().min(1).max(64).optional(),
  pageId: z.string().min(1).max(64).optional(),
  token: SecretOrPlain,
})
const LoaderConfluence = z.object({
  kind: z.literal('confluence'),
  baseUrl: z.string().url(),
  spaceKey: z.string().min(1).max(64),
  token: SecretOrPlain,
})
const LoaderGithub = z.object({
  kind: z.literal('github'),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  ref: z.string().max(128).default('main'),
  paths: z.array(z.string().max(256)).max(64).optional(),
  token: SecretOrPlain.optional(),
})
const LoaderS3 = z.object({
  kind: z.literal('s3'),
  bucket: z.string().min(1).max(128),
  prefix: z.string().max(512).optional(),
  region: z.string().min(1).max(64),
  credentials: SecretOrPlain.optional(),
})
const LoaderFirecrawl = z.object({
  kind: z.literal('firecrawl'),
  url: z.string().url(),
  apiKey: SecretOrPlain,
  mode: z.enum(['scrape', 'crawl']).default('scrape'),
})
const LoaderPlugin = z.object({
  kind: z.literal('plugin'),
  pluginId: Slug,
  config: z.record(z.string(), z.unknown()).optional(),
})

export const RagLoader = z.discriminatedUnion('kind', [
  LoaderFs,
  LoaderWeb,
  LoaderPdf,
  LoaderNotion,
  LoaderConfluence,
  LoaderGithub,
  LoaderS3,
  LoaderFirecrawl,
  LoaderPlugin,
])
export type RagLoader = z.infer<typeof RagLoader>

export const EmbedderConfig = z.object({
  provider: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  dimensions: z.number().int().positive().max(8192).optional(),
  apiKey: SecretOrPlain.optional(),
  batchSize: z.number().int().positive().max(2048).default(64),
})
export type EmbedderConfig = z.infer<typeof EmbedderConfig>

const VectorStoreSqlite = z.object({
  kind: z.literal('sqlite'),
  path: z.string().min(1).max(1024),
})
const VectorStoreTurso = z.object({
  kind: z.literal('turso'),
  url: SecretOrPlain,
  authToken: SecretOrPlain,
})
const VectorStoreRedis = z.object({
  kind: z.literal('redis'),
  url: SecretOrPlain,
  prefix: z.string().min(1).max(64).default('agentskitos:rag:'),
})
const VectorStoreFile = z.object({
  kind: z.literal('file'),
  path: z.string().min(1).max(1024),
})
const VectorStorePgvector = z.object({
  kind: z.literal('pgvector'),
  connectionString: SecretOrPlain,
  table: z.string().min(1).max(128).default('embeddings'),
})
const VectorStoreQdrant = z.object({
  kind: z.literal('qdrant'),
  url: z.string().url(),
  apiKey: SecretOrPlain.optional(),
  collection: z.string().min(1).max(128),
})
const VectorStorePinecone = z.object({
  kind: z.literal('pinecone'),
  apiKey: SecretOrPlain,
  indexName: z.string().min(1).max(128),
  namespace: z.string().max(128).optional(),
})
const VectorStoreWeaviate = z.object({
  kind: z.literal('weaviate'),
  url: z.string().url(),
  apiKey: SecretOrPlain.optional(),
  className: z.string().min(1).max(128),
})
const VectorStorePlugin = z.object({
  kind: z.literal('plugin'),
  pluginId: Slug,
  config: z.record(z.string(), z.unknown()).optional(),
})

export const VectorStoreConfig = z.discriminatedUnion('kind', [
  VectorStoreSqlite,
  VectorStoreTurso,
  VectorStoreRedis,
  VectorStoreFile,
  VectorStorePgvector,
  VectorStoreQdrant,
  VectorStorePinecone,
  VectorStoreWeaviate,
  VectorStorePlugin,
])
export type VectorStoreConfig = z.infer<typeof VectorStoreConfig>

export const RerankerKind = z.enum(['cohere', 'voyage', 'jina', 'cross-encoder', 'mmr', 'rrf', 'plugin'])
export type RerankerKind = z.infer<typeof RerankerKind>

export const RerankerConfig = z.object({
  kind: RerankerKind,
  model: z.string().min(1).max(128).optional(),
  apiKey: SecretOrPlain.optional(),
  topN: z.number().int().positive().max(1000).default(20),
  pluginId: Slug.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})
export type RerankerConfig = z.infer<typeof RerankerConfig>

export const HybridSearchConfig = z.object({
  enabled: z.boolean().default(false),
  sparseWeight: z.number().min(0).max(1).default(0.3),
  denseWeight: z.number().min(0).max(1).default(0.7),
  sparseAlgorithm: z.enum(['bm25', 'tfidf', 'splade']).default('bm25'),
})
export type HybridSearchConfig = z.infer<typeof HybridSearchConfig>

export const RagPipeline = z.object({
  id: Slug,
  description: z.string().max(512).optional(),
  loader: RagLoader,
  chunker: ChunkerConfig.default(() => ChunkerConfig.parse({})),
  embedder: EmbedderConfig,
  vectorStore: VectorStoreConfig,
  rerankers: z.array(RerankerConfig).max(8).default([]),
  topK: z.number().int().positive().max(1000).default(10),
  hybridSearch: HybridSearchConfig.optional(),
  refresh: z
    .object({
      mode: z.enum(['manual', 'cron', 'on-change']).default('manual'),
      cron: z.string().max(128).optional(),
    })
    .optional(),
  tags: TagList.default([]),
})
export type RagPipeline = z.infer<typeof RagPipeline>

export const RagPipelineRef = z.object({
  id: Slug,
  topK: z.number().int().positive().max(1000).optional(),
})
export type RagPipelineRef = z.infer<typeof RagPipelineRef>

export const RagConfig = z.object({
  pipelines: z.array(RagPipeline).max(64).default([]),
})
export type RagConfig = z.infer<typeof RagConfig>

export const parseRagConfig = (input: unknown): RagConfig => RagConfig.parse(input)
export const safeParseRagConfig = (input: unknown) => RagConfig.safeParse(input)

export const parseRagPipeline = (input: unknown): RagPipeline => RagPipeline.parse(input)
export const safeParseRagPipeline = (input: unknown) => RagPipeline.safeParse(input)
