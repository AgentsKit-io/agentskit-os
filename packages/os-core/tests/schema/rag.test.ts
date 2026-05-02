import { describe, expect, it } from 'vitest'
import {
  parseRagConfig,
  parseRagPipeline,
  safeParseRagConfig,
  safeParseRagPipeline,
} from '../../src/schema/rag.js'

const baseEmbedder = { provider: 'openai', model: 'text-embedding-3-small' }
const baseStore = { kind: 'sqlite' as const, path: '/tmp/rag.db' }

const minimal = {
  id: 'docs',
  loader: { kind: 'fs' as const, path: '/data/docs' },
  embedder: baseEmbedder,
  vectorStore: baseStore,
}

describe('RagPipeline', () => {
  describe('accept', () => {
    it('parses minimal pipeline with defaults', () => {
      const p = parseRagPipeline(minimal)
      expect(p.id).toBe('docs')
      expect(p.topK).toBe(10)
      expect(p.chunker.strategy).toBe('recursive')
      expect(p.chunker.size).toBe(1024)
    })

    it('parses web loader with crawl', () => {
      const p = parseRagPipeline({
        ...minimal,
        loader: { kind: 'web', urls: ['https://example.com'], followLinks: true, maxDepth: 2 },
      })
      expect(p.loader.kind).toBe('web')
    })

    it('parses pdf loader', () => {
      const p = parseRagPipeline({
        ...minimal,
        loader: { kind: 'pdf', path: '/data/handbook.pdf' },
      })
      expect(p.loader.kind).toBe('pdf')
    })

    it('parses notion loader with vault token', () => {
      const p = parseRagPipeline({
        ...minimal,
        loader: { kind: 'notion', databaseId: 'abc123', token: '${vault:notion_token}' },
      })
      expect(p.loader.kind).toBe('notion')
    })

    it('parses confluence loader', () => {
      const p = parseRagPipeline({
        ...minimal,
        loader: {
          kind: 'confluence',
          baseUrl: 'https://team.atlassian.net/wiki',
          spaceKey: 'ENG',
          token: '${vault:confluence_token}',
        },
      })
      expect(p.loader.kind).toBe('confluence')
    })

    it('parses github loader', () => {
      const p = parseRagPipeline({
        ...minimal,
        loader: { kind: 'github', repo: 'AgentsKit-io/agentskit', ref: 'main' },
      })
      expect(p.loader.kind).toBe('github')
    })

    it('parses s3 loader', () => {
      const p = parseRagPipeline({
        ...minimal,
        loader: { kind: 's3', bucket: 'my-docs', region: 'us-east-1' },
      })
      expect(p.loader.kind).toBe('s3')
    })

    it('parses firecrawl loader', () => {
      const p = parseRagPipeline({
        ...minimal,
        loader: {
          kind: 'firecrawl',
          url: 'https://example.com',
          apiKey: '${vault:firecrawl_key}',
          mode: 'crawl',
        },
      })
      expect(p.loader.kind).toBe('firecrawl')
    })

    it('parses plugin loader', () => {
      const p = parseRagPipeline({
        ...minimal,
        loader: { kind: 'plugin', pluginId: 'custom-loader', config: { foo: 'bar' } },
      })
      expect(p.loader.kind).toBe('plugin')
    })

    it.each([['sqlite'], ['turso'], ['redis'], ['file'], ['pgvector'], ['qdrant'], ['pinecone'], ['weaviate']])(
      'parses %s vector store',
      (kind) => {
        const stores: Record<string, unknown> = {
          sqlite: { kind: 'sqlite', path: '/tmp/v.db' },
          turso: { kind: 'turso', url: 'libsql://x', authToken: '${vault:turso_token}' },
          redis: { kind: 'redis', url: 'redis://localhost:6379' },
          file: { kind: 'file', path: '/tmp/v.json' },
          pgvector: { kind: 'pgvector', connectionString: 'postgres://u:p@h/db', table: 'embeds' },
          qdrant: { kind: 'qdrant', url: 'https://qdrant.example.com', collection: 'docs' },
          pinecone: { kind: 'pinecone', apiKey: '${vault:pc}', indexName: 'docs' },
          weaviate: { kind: 'weaviate', url: 'https://w.example.com', className: 'Doc' },
        }
        const p = parseRagPipeline({ ...minimal, vectorStore: stores[kind] })
        expect((p.vectorStore as { kind: string }).kind).toBe(kind)
      },
    )

    it('parses with rerankers and hybrid search', () => {
      const p = parseRagPipeline({
        ...minimal,
        rerankers: [{ kind: 'cohere', model: 'rerank-v3', apiKey: '${vault:cohere}', topN: 5 }],
        hybridSearch: { enabled: true, sparseWeight: 0.4, denseWeight: 0.6 },
      })
      expect(p.rerankers).toHaveLength(1)
      expect(p.hybridSearch?.enabled).toBe(true)
    })

    it('parses cron refresh schedule', () => {
      const p = parseRagPipeline({
        ...minimal,
        refresh: { mode: 'cron', cron: '0 2 * * *' },
      })
      expect(p.refresh?.mode).toBe('cron')
    })

    it('parses chunker semantic strategy', () => {
      const p = parseRagPipeline({
        ...minimal,
        chunker: { strategy: 'semantic', size: 2048, overlap: 200 },
      })
      expect(p.chunker.strategy).toBe('semantic')
    })
  })

  describe('reject', () => {
    it('rejects unknown loader kind', () => {
      expect(
        safeParseRagPipeline({ ...minimal, loader: { kind: 'ftp', path: '/x' } }).success,
      ).toBe(false)
    })

    it('rejects unknown vector store kind', () => {
      expect(
        safeParseRagPipeline({ ...minimal, vectorStore: { kind: 'mongo', uri: 'x' } }).success,
      ).toBe(false)
    })

    it('rejects empty web urls list', () => {
      expect(
        safeParseRagPipeline({
          ...minimal,
          loader: { kind: 'web', urls: [] },
        }).success,
      ).toBe(false)
    })

    it('rejects bad github repo format', () => {
      expect(
        safeParseRagPipeline({
          ...minimal,
          loader: { kind: 'github', repo: 'not-a-repo' },
        }).success,
      ).toBe(false)
    })

    it('rejects negative chunker overlap', () => {
      expect(
        safeParseRagPipeline({
          ...minimal,
          chunker: { strategy: 'fixed', size: 1024, overlap: -1 },
        }).success,
      ).toBe(false)
    })

    it('rejects topK over max', () => {
      expect(safeParseRagPipeline({ ...minimal, topK: 100_000 }).success).toBe(false)
    })

    it('rejects hybrid weight over 1', () => {
      expect(
        safeParseRagPipeline({
          ...minimal,
          hybridSearch: { enabled: true, sparseWeight: 1.5, denseWeight: 0.5 },
        }).success,
      ).toBe(false)
    })

    it('rejects bad slug id', () => {
      expect(safeParseRagPipeline({ ...minimal, id: 'Bad ID!' }).success).toBe(false)
    })
  })
})

describe('RagConfig', () => {
  it('accepts empty pipelines', () => {
    const c = parseRagConfig({})
    expect(c.pipelines).toEqual([])
  })

  it('accepts multiple pipelines', () => {
    const c = parseRagConfig({
      pipelines: [
        minimal,
        { ...minimal, id: 'kb', loader: { kind: 'web', urls: ['https://kb.example.com'] } },
      ],
    })
    expect(c.pipelines).toHaveLength(2)
  })

  it('rejects more than 64 pipelines', () => {
    const pipelines = Array.from({ length: 65 }, (_, i) => ({ ...minimal, id: `p${i}` }))
    expect(safeParseRagConfig({ pipelines }).success).toBe(false)
  })

  it('throws on parseRagConfig with invalid input', () => {
    expect(() => parseRagConfig({ pipelines: [{ id: 'bad' }] })).toThrow()
  })
})
