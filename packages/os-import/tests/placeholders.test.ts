import { describe, expect, it } from 'vitest'
import { difyImporter, langflowImporter } from '../src/index.js'

describe('langflowImporter (M2 placeholder)', () => {
  it('detect matches Langflow shape', () => {
    expect(langflowImporter.detect({ name: 'x', data: {} })).toBe(true)
  })

  it('detect rejects non-Langflow', () => {
    expect(langflowImporter.detect({})).toBe(false)
  })

  it('parse throws "not yet implemented"', () => {
    expect(() => langflowImporter.parse({ name: 'x', data: {} })).toThrow(/not yet implemented/)
  })
})

describe('difyImporter (M2 placeholder)', () => {
  it('detect matches Dify shape', () => {
    expect(difyImporter.detect({ app: {}, workflow: {} })).toBe(true)
  })

  it('detect rejects non-Dify', () => {
    expect(difyImporter.detect({ app: {} })).toBe(false)
  })

  it('parse throws "not yet implemented"', () => {
    expect(() => difyImporter.parse({ app: {}, workflow: {} })).toThrow(/not yet implemented/)
  })
})
