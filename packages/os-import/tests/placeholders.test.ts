import { describe, expect, it } from 'vitest'
import { difyImporter } from '../src/index.js'

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
