import { describe, expect, it } from 'vitest'
import { parseMemoryConfig, safeParseMemoryConfig } from '../../src/schema/memory.js'

describe('MemoryConfig', () => {
  it('parses in-memory backend', () => {
    const m = parseMemoryConfig({ backend: 'in-memory' })
    expect(m.backend).toBe('in-memory')
  })

  it('parses file backend', () => {
    const m = parseMemoryConfig({ backend: 'file', path: '/var/x.json' })
    expect(m.backend).toBe('file')
  })

  it('parses sqlite backend', () => {
    const m = parseMemoryConfig({ backend: 'sqlite', path: './memory.db' })
    expect(m.backend).toBe('sqlite')
  })

  it('parses redis backend with vault URL', () => {
    const m = parseMemoryConfig({ backend: 'redis', url: '${vault:redis_url}' })
    expect(m.backend === 'redis' && m.prefix).toBe('agentskitos:')
  })

  it('parses vector backend', () => {
    const m = parseMemoryConfig({
      backend: 'vector',
      provider: 'lancedb',
      collection: 'docs',
      dimensions: 1536,
      embeddings: { provider: 'openai', model: 'text-embedding-3-small' },
    })
    expect(m.backend === 'vector' && m.provider).toBe('lancedb')
  })

  it('parses localstorage backend', () => {
    const m = parseMemoryConfig({ backend: 'localstorage' })
    expect(m.backend === 'localstorage' && m.key).toBe('agentskitos:memory')
  })

  it('rejects unknown backend', () => {
    expect(safeParseMemoryConfig({ backend: 'mongo' }).success).toBe(false)
  })

  it('rejects vector backend missing dimensions', () => {
    const r = safeParseMemoryConfig({
      backend: 'vector',
      provider: 'qdrant',
      collection: 'x',
      embeddings: { provider: 'openai', model: 'm' },
    })
    expect(r.success).toBe(false)
  })

  it('rejects vector backend with unknown provider', () => {
    const r = safeParseMemoryConfig({
      backend: 'vector',
      provider: 'rocketdb',
      collection: 'x',
      dimensions: 1024,
      embeddings: { provider: 'openai', model: 'm' },
    })
    expect(r.success).toBe(false)
  })

  it('rejects ttlSeconds out of range', () => {
    expect(
      safeParseMemoryConfig({ backend: 'in-memory', ttlSeconds: 31_536_001 }).success,
    ).toBe(false)
  })

  it('throws on parseMemoryConfig with invalid input', () => {
    expect(() => parseMemoryConfig({})).toThrow()
  })
})
