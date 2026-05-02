import { describe, expect, it } from 'vitest'
import {
  allCategories,
  allTags,
  builtInTemplates,
  findTemplate,
  listTemplates,
} from '../src/index.js'

describe('builtInTemplates', () => {
  it('ships at least 5 templates', () => {
    expect(builtInTemplates.length).toBeGreaterThanOrEqual(5)
  })

  it('every template has unique id', () => {
    const ids = new Set(builtInTemplates.map((t) => t.id))
    expect(ids.size).toBe(builtInTemplates.length)
  })

  it('every template has at least one flow', () => {
    for (const t of builtInTemplates) {
      expect(t.flows.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('every template has SemVer version', () => {
    for (const t of builtInTemplates) {
      expect(t.version).toMatch(/^\d+\.\d+\.\d+/)
    }
  })

  it('every flow.entry resolves to a node', () => {
    for (const t of builtInTemplates) {
      for (const f of t.flows) {
        const ids = f.nodes.map((n) => n.id)
        expect(ids).toContain(f.entry)
      }
    }
  })

  it('every agent ref in flow nodes resolves to template agent list', () => {
    for (const t of builtInTemplates) {
      const agentIds = new Set(t.agents.map((a) => a.id))
      for (const f of t.flows) {
        for (const n of f.nodes) {
          if (n.kind === 'agent') {
            expect(agentIds.has(n.agent)).toBe(true)
          }
        }
      }
    }
  })
})

describe('findTemplate', () => {
  it('finds by id', () => {
    expect(findTemplate('pr-review')?.name).toBe('GitHub PR Review')
  })

  it('returns undefined for unknown id', () => {
    expect(findTemplate('nope')).toBeUndefined()
  })
})

describe('listTemplates', () => {
  it('filters by category', () => {
    const coding = listTemplates({ category: 'coding' })
    expect(coding.every((t) => t.category === 'coding')).toBe(true)
    expect(coding.length).toBeGreaterThanOrEqual(1)
  })

  it('filters by tag', () => {
    const ragTemplates = listTemplates({ tag: 'rag' })
    expect(ragTemplates.every((t) => t.tags.includes('rag'))).toBe(true)
  })

  it('combines filters', () => {
    const r = listTemplates({ category: 'clinical', tag: 'vote' })
    expect(r.length).toBeGreaterThanOrEqual(1)
  })

  it('returns all when no filter', () => {
    expect(listTemplates({}).length).toBe(builtInTemplates.length)
  })
})

describe('allTags / allCategories', () => {
  it('returns sorted unique tags', () => {
    const tags = allTags()
    expect(tags.length).toBeGreaterThan(0)
    const sorted = [...tags].sort()
    expect(tags).toEqual(sorted)
  })

  it('returns categories used by templates', () => {
    const cats = allCategories()
    expect(cats).toContain('coding')
    expect(cats).toContain('marketing')
    expect(cats).toContain('clinical')
  })
})
