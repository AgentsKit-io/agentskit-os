import { describe, expect, it } from 'vitest'
import { parseRagConfig, safeParseRagConfig } from '../../src/schema/rag.js'

const base = {
  id: 'docs',
  name: 'Docs',
  store: 'main',
  embeddings: { provider: 'openai', model: 'text-embedding-3-small', dimensions: 1536 },
}

describe('RagConfig', () => {
  describe('accept', () => {
    it('parses minimal config with defaults', () => {
      const r = parseRagConfig(base)
      expect(r.chunker.strategy).toBe('paragraph')
      expect(r.chunker.size).toBe(1024)
      expect(r.chunker.overlap).toBe(128)
      expect(r.retriever.topK).toBe(5)
      expect(r.loaders).toEqual([])
    })

    it('parses with file loader', () => {
      const r = parseRagConfig({
        ...base,
        loaders: [{ id: 'guides', kind: 'file', path: './docs', glob: '**/*.md' }],
      })
      expect(r.loaders).toHaveLength(1)
    })

    it('parses with url loader', () => {
      const r = parseRagConfig({
        ...base,
        loaders: [
          { id: 'web', kind: 'url', urls: ['https://example.com'], recursive: true, maxDepth: 2 },
        ],
      })
      expect(r.loaders[0]?.kind).toBe('url')
    })

    it('parses with sql loader using vault secret', () => {
      const r = parseRagConfig({
        ...base,
        loaders: [
          {
            id: 'pg',
            kind: 'sql',
            connection: '${vault:pg_url}',
            query: 'SELECT id, body FROM articles',
          },
        ],
      })
      expect(r.loaders[0]?.kind).toBe('sql')
    })

    it('parses api loader with vault headers', () => {
      const r = parseRagConfig({
        ...base,
        loaders: [
          {
            id: 'crm',
            kind: 'api',
            endpoint: 'https://api.example.com/items',
            headers: { Authorization: '${vault:api_key}' },
            jsonPath: '$.data[*]',
          },
        ],
      })
      expect(r.loaders[0]?.kind).toBe('api')
    })

    it('parses retriever with reranker', () => {
      const r = parseRagConfig({
        ...base,
        retriever: {
          topK: 20,
          similarityThreshold: 0.7,
          hybridSearch: true,
          reranker: { enabled: true, provider: 'cohere', model: 'rerank-english-v3.0', topN: 5 },
        },
      })
      expect(r.retriever.reranker?.provider).toBe('cohere')
    })

    it('parses all chunk strategies', () => {
      for (const s of ['fixed', 'sentence', 'paragraph', 'semantic', 'markdown']) {
        const r = parseRagConfig({ ...base, chunker: { strategy: s } })
        expect(r.chunker.strategy).toBe(s)
      }
    })
  })

  describe('reject', () => {
    it('rejects missing embeddings', () => {
      const { embeddings, ...rest } = base
      expect(safeParseRagConfig(rest).success).toBe(false)
    })

    it('rejects bad id slug', () => {
      expect(safeParseRagConfig({ ...base, id: 'BAD' }).success).toBe(false)
    })

    it('rejects unknown chunk strategy', () => {
      expect(safeParseRagConfig({ ...base, chunker: { strategy: 'magic' } }).success).toBe(false)
    })

    it('rejects chunk size below minimum', () => {
      expect(safeParseRagConfig({ ...base, chunker: { size: 32 } }).success).toBe(false)
    })

    it('rejects negative overlap', () => {
      expect(safeParseRagConfig({ ...base, chunker: { overlap: -1 } }).success).toBe(false)
    })

    it('rejects similarityThreshold > 1', () => {
      expect(
        safeParseRagConfig({ ...base, retriever: { similarityThreshold: 1.5 } }).success,
      ).toBe(false)
    })

    it('rejects unknown loader kind', () => {
      expect(
        safeParseRagConfig({ ...base, loaders: [{ id: 'x', kind: 'magic' } as never] }).success,
      ).toBe(false)
    })

    it('rejects empty url loader urls array', () => {
      expect(
        safeParseRagConfig({ ...base, loaders: [{ id: 'u', kind: 'url', urls: [] }] }).success,
      ).toBe(false)
    })

    it('rejects unknown reranker provider', () => {
      expect(
        safeParseRagConfig({
          ...base,
          retriever: { reranker: { provider: 'random-rank' } },
        }).success,
      ).toBe(false)
    })

    it('throws on parseRagConfig with invalid input', () => {
      expect(() => parseRagConfig({})).toThrow()
    })
  })
})
