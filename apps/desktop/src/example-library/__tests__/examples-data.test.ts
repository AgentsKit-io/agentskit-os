/**
 * Data-shape tests for the example library.
 *
 * Validates that every entry in EXAMPLES conforms to the ExampleSchema Zod
 * shape and that the canonical intent categories are present.
 */

import { describe, it, expect } from 'vitest'
import { ExampleSchema } from '../example-types'
import { EXAMPLES, ALL_INTENTS } from '../examples-data'

describe('EXAMPLES data', () => {
  it('has exactly 12 examples', () => {
    expect(EXAMPLES).toHaveLength(12)
  })

  it('every example passes ExampleSchema validation', () => {
    for (const ex of EXAMPLES) {
      const result = ExampleSchema.safeParse(ex)
      expect(result.success, `Schema failed for id="${ex.id}": ${JSON.stringify(result)}`).toBe(true)
    }
  })

  it('every id is unique', () => {
    const ids = EXAMPLES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every example has a non-empty intent', () => {
    for (const ex of EXAMPLES) {
      expect(ex.intent.trim().length).toBeGreaterThan(0)
    }
  })

  it('every example has a non-empty title', () => {
    for (const ex of EXAMPLES) {
      expect(ex.title.trim().length).toBeGreaterThan(0)
    }
  })

  it('every example has a non-empty description', () => {
    for (const ex of EXAMPLES) {
      expect(ex.description.trim().length).toBeGreaterThan(0)
    }
  })

  it('every example has a tags array', () => {
    for (const ex of EXAMPLES) {
      expect(Array.isArray(ex.tags)).toBe(true)
    }
  })

  it('templateId is either a non-empty string or null', () => {
    for (const ex of EXAMPLES) {
      if (ex.templateId !== null) {
        expect(typeof ex.templateId).toBe('string')
        expect(ex.templateId.length).toBeGreaterThan(0)
      }
    }
  })

  it('at least one example has a non-null templateId', () => {
    expect(EXAMPLES.some((e) => e.templateId !== null)).toBe(true)
  })

  it('at least one example has a null templateId (coming soon)', () => {
    expect(EXAMPLES.some((e) => e.templateId === null)).toBe(true)
  })

  it('estCostUsd, when present, is a non-negative number', () => {
    for (const ex of EXAMPLES) {
      if (ex.estCostUsd !== undefined) {
        expect(typeof ex.estCostUsd).toBe('number')
        expect(ex.estCostUsd).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('estTokens, when present, is a non-negative integer', () => {
    for (const ex of EXAMPLES) {
      if (ex.estTokens !== undefined) {
        expect(Number.isInteger(ex.estTokens)).toBe(true)
        expect(ex.estTokens).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // Intent coverage
  const EXPECTED_INTENTS = [
    'Triage support tickets',
    'Summarize a research paper',
    'Generate a PR review',
    'Compare two LLMs on the same prompt',
    'Run a periodic data pipeline',
    'Classify customer feedback',
  ] as const

  for (const intent of EXPECTED_INTENTS) {
    it(`has at least one example with intent "${intent}"`, () => {
      expect(EXAMPLES.some((e) => e.intent === intent)).toBe(true)
    })
  }
})

describe('ALL_INTENTS', () => {
  it('contains no duplicates', () => {
    expect(new Set(ALL_INTENTS).size).toBe(ALL_INTENTS.length)
  })

  it('matches the distinct intents in EXAMPLES', () => {
    const fromData = [...new Set(EXAMPLES.map((e) => e.intent))].sort()
    expect([...ALL_INTENTS].sort()).toEqual(fromData)
  })
})
