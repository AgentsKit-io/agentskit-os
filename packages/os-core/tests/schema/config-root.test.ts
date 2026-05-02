import { describe, expect, it } from 'vitest'
import { parseConfigRoot, safeParseConfigRoot } from '../../src/schema/config-root.js'

const minimal = {
  schemaVersion: 1,
  workspace: { schemaVersion: 1, id: 'team-a', name: 'Team A' },
  vault: { backend: 'os-keychain' },
  security: {},
  observability: {},
}

describe('ConfigRoot', () => {
  describe('accept', () => {
    it('parses minimal root', () => {
      const c = parseConfigRoot(minimal)
      expect(c.workspace.id).toBe('team-a')
      expect(c.agents).toEqual([])
      expect(c.flows).toEqual([])
      expect(c.triggers).toEqual([])
    })

    it('parses full graph with cross-refs', () => {
      const c = parseConfigRoot({
        ...minimal,
        memory: { default: { backend: 'sqlite', path: './m.db' } },
        plugins: [
          {
            id: 'web-search',
            name: 'Web Search',
            version: '1.0.0',
            source: 'npm:@agentskit/tool-web-search',
            contributes: ['tool'],
          },
        ],
        agents: [
          {
            id: 'researcher',
            name: 'Researcher',
            model: { provider: 'openai', model: 'gpt-4o' },
            memory: { ref: 'default' },
          },
        ],
        flows: [
          {
            id: 'pr-review',
            name: 'PR Review',
            entry: 'fetch',
            nodes: [{ id: 'fetch', kind: 'agent', agent: 'researcher' }],
            edges: [],
          },
        ],
        triggers: [
          {
            id: 'daily',
            name: 'Daily',
            kind: 'cron',
            cron: '0 9 * * *',
            flow: 'pr-review',
          },
        ],
      })
      expect(c.flows).toHaveLength(1)
      expect(c.triggers).toHaveLength(1)
    })
  })

  describe('cross-reference validation', () => {
    it('rejects trigger pointing at unknown flow', () => {
      const r = safeParseConfigRoot({
        ...minimal,
        triggers: [
          { id: 't1', name: 'T', kind: 'cron', cron: '* * * * *', flow: 'ghost-flow' },
        ],
      })
      expect(r.success).toBe(false)
    })

    it('rejects flow node referencing unknown agent', () => {
      const r = safeParseConfigRoot({
        ...minimal,
        flows: [
          {
            id: 'f1',
            name: 'F',
            entry: 'a',
            nodes: [{ id: 'a', kind: 'agent', agent: 'ghost-agent' }],
            edges: [],
          },
        ],
      })
      expect(r.success).toBe(false)
    })

    it('rejects agent referencing unknown memory ref', () => {
      const r = safeParseConfigRoot({
        ...minimal,
        agents: [
          {
            id: 'a',
            name: 'A',
            model: { provider: 'openai', model: 'gpt-4o' },
            memory: { ref: 'ghost-memory' },
          },
        ],
      })
      expect(r.success).toBe(false)
    })

    it('rejects duplicate plugin ids', () => {
      const p = {
        id: 'dup',
        name: 'D',
        version: '1.0.0',
        source: 'npm:@x/y',
        contributes: ['tool'],
      }
      const r = safeParseConfigRoot({ ...minimal, plugins: [p, p] })
      expect(r.success).toBe(false)
    })

    it('rejects duplicate agent ids', () => {
      const a = {
        id: 'dup',
        name: 'A',
        model: { provider: 'openai', model: 'gpt-4o' },
      }
      const r = safeParseConfigRoot({ ...minimal, agents: [a, a] })
      expect(r.success).toBe(false)
    })

    it('rejects duplicate flow ids', () => {
      const f = {
        id: 'dup',
        name: 'F',
        entry: 'a',
        nodes: [{ id: 'a', kind: 'tool', tool: 'x' }],
        edges: [],
      }
      const r = safeParseConfigRoot({ ...minimal, flows: [f, f] })
      expect(r.success).toBe(false)
    })

    it('rejects duplicate trigger ids', () => {
      const t = { id: 'dup', name: 'T', kind: 'cron', cron: '* * * * *', flow: 'pr-review' }
      const flows = [
        {
          id: 'pr-review',
          name: 'F',
          entry: 'a',
          nodes: [{ id: 'a', kind: 'tool', tool: 'x' }],
          edges: [],
        },
      ]
      const r = safeParseConfigRoot({ ...minimal, flows, triggers: [t, t] })
      expect(r.success).toBe(false)
    })

    it('rejects requireSignedPlugins=true with unsigned plugin', () => {
      const r = safeParseConfigRoot({
        ...minimal,
        security: { requireSignedPlugins: true },
        plugins: [
          {
            id: 'web-search',
            name: 'Web Search',
            version: '1.0.0',
            source: 'npm:@agentskit/tool-web-search',
            contributes: ['tool'],
          },
        ],
      })
      expect(r.success).toBe(false)
    })

    it('accepts requireSignedPlugins=true when plugins are signed', () => {
      const c = parseConfigRoot({
        ...minimal,
        security: { requireSignedPlugins: true },
        plugins: [
          {
            id: 'web-search',
            name: 'Web Search',
            version: '1.0.0',
            source: 'npm:@agentskit/tool-web-search',
            contributes: ['tool'],
            signature: {
              algorithm: 'ed25519',
              publicKey: 'A'.repeat(64),
              signature: 'B'.repeat(64),
            },
          },
        ],
      })
      expect(c.plugins).toHaveLength(1)
    })

    it('rejects mismatched workspace schemaVersion', () => {
      const r = safeParseConfigRoot({
        ...minimal,
        schemaVersion: 1,
        workspace: { schemaVersion: 2 as unknown as 1, id: 'x', name: 'X' },
      })
      expect(r.success).toBe(false)
    })

    it('rejects rag pointing at unknown memory store', () => {
      const r = safeParseConfigRoot({
        ...minimal,
        rag: [
          {
            id: 'docs',
            name: 'Docs',
            store: 'ghost',
            embeddings: { provider: 'openai', model: 'text-embedding-3-small', dimensions: 1536 },
          },
        ],
      })
      expect(r.success).toBe(false)
    })

    it('accepts rag with valid memory store', () => {
      const c = parseConfigRoot({
        ...minimal,
        memory: { docs_vec: { backend: 'vector', provider: 'lancedb', collection: 'docs', dimensions: 1536, embeddings: { provider: 'openai', model: 'm' } } },
        rag: [
          {
            id: 'docs',
            name: 'Docs',
            store: 'docs_vec',
            embeddings: { provider: 'openai', model: 'text-embedding-3-small', dimensions: 1536 },
          },
        ],
      })
      expect(c.rag).toHaveLength(1)
    })

    it('rejects duplicate rag ids', () => {
      const r = safeParseConfigRoot({
        ...minimal,
        memory: { m: { backend: 'in-memory' } },
        rag: [
          {
            id: 'dup',
            name: 'A',
            store: 'm',
            embeddings: { provider: 'openai', model: 'm', dimensions: 1536 },
          },
          {
            id: 'dup',
            name: 'B',
            store: 'm',
            embeddings: { provider: 'openai', model: 'm', dimensions: 1536 },
          },
        ],
      })
      expect(r.success).toBe(false)
    })
  })

  describe('size limits', () => {
    it('rejects more than 1024 agents', () => {
      const agents = Array.from({ length: 1025 }, (_, i) => ({
        id: `a${i}`,
        name: `A${i}`,
        model: { provider: 'openai', model: 'gpt-4o' },
      }))
      expect(safeParseConfigRoot({ ...minimal, agents }).success).toBe(false)
    })
  })

  describe('parse — reject', () => {
    it('rejects missing workspace', () => {
      const { workspace, ...rest } = minimal
      expect(safeParseConfigRoot(rest).success).toBe(false)
    })

    it('throws on parseConfigRoot with invalid input', () => {
      expect(() => parseConfigRoot({})).toThrow()
    })
  })
})
