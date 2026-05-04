import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseConfigRoot } from '@agentskit/os-core'
import {
  TEMPLATES,
  TemplateMetadataSchema,
  allCategories,
  allTags,
  builtInTemplates,
  findTemplate,
  listTemplates,
} from '../src/index.js'

const templatesRoot = join(process.cwd(), 'templates')

const templateDirs = (): string[] =>
  readdirSync(templatesRoot, { withFileTypes: true }).flatMap((category) => {
    if (!category.isDirectory()) return []
    const categoryDir = join(templatesRoot, category.name)
    return readdirSync(categoryDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(categoryDir, entry.name))
  })

describe('builtInTemplates', () => {
  it('ships 50+ templates', () => {
    expect(builtInTemplates.length).toBeGreaterThanOrEqual(50)
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(50)
  })

  it('every template has unique id', () => {
    const ids = new Set(builtInTemplates.map((t) => t.id))
    expect(ids.size).toBe(builtInTemplates.length)
  })

  it('every template has metadata, agents, and at least one flow', () => {
    for (const t of builtInTemplates) {
      expect(TemplateMetadataSchema.parse(t.metadata).id).toBe(t.id)
      expect(t.agents.length).toBeGreaterThanOrEqual(1)
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

describe('template asset directories', () => {
  it('ships metadata, readme, and YAML assets for every template', () => {
    const dirs = templateDirs()
    expect(dirs.length).toBeGreaterThanOrEqual(50)

    const ids = new Set(TEMPLATES.map((t) => t.id))
    for (const dir of dirs) {
      expect(existsSync(join(dir, 'README.md'))).toBe(true)
      const metadata = TemplateMetadataSchema.parse(
        JSON.parse(readFileSync(join(dir, 'metadata.json'), 'utf8')),
      )
      expect(ids.has(metadata.id)).toBe(true)
      const config = JSON.parse(readFileSync(join(dir, 'template.yaml'), 'utf8'))
      const parsed = parseConfigRoot(config)
      expect(parsed.flows.length).toBeGreaterThanOrEqual(1)
      expect(parsed.agents.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('findTemplate', () => {
  it('finds by id', () => {
    expect(findTemplate('pr-review-3-way')?.name).toBe('Pr Review 3 Way')
  })

  it('returns undefined for unknown id', () => {
    expect(findTemplate('nope')).toBeUndefined()
  })
})

describe('listTemplates', () => {
  it('filters by category', () => {
    const coding = listTemplates({ category: 'coding' })
    expect(coding.every((t) => t.category === 'coding')).toBe(true)
    expect(coding.length).toBeGreaterThanOrEqual(10)
  })

  it('filters by tag', () => {
    const githubTemplates = listTemplates({ tag: 'coding' })
    expect(githubTemplates.every((t) => t.tags.includes('coding'))).toBe(true)
  })

  it('combines filters', () => {
    const r = listTemplates({ category: 'healthcare', tag: 'healthcare' })
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
    expect(cats).toContain('marketing-content')
    expect(cats).toContain('healthcare')
    expect(cats).toContain('compare-vote')
  })
})
