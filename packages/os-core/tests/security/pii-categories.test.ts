import { describe, expect, it } from 'vitest'
import {
  applyPiiCategoryRegistry,
  createPiiCategoryRegistry,
} from '../../src/index.js'

describe('PII category registry (#201)', () => {
  it('register + list + get round-trips a definition', () => {
    const r = createPiiCategoryRegistry()
    expect(r.register({
      id: 'iban',
      label: 'IBAN',
      description: 'Bank account',
      pattern: '\\b[A-Z]{2}\\d{2}[A-Z0-9]{4,30}\\b',
    })).toBe('registered')
    expect(r.list()).toHaveLength(1)
    expect(r.get('iban')?.label).toBe('IBAN')
  })

  it('reports conflict when an id is already registered', () => {
    const r = createPiiCategoryRegistry()
    r.register({ id: 'x', label: 'X', description: '', pattern: '\\bx\\b' })
    expect(r.register({ id: 'x', label: 'X2', description: '', pattern: '\\bx\\b' })).toBe('conflict')
  })

  it('compile produces RegExp + mask for every entry', () => {
    const r = createPiiCategoryRegistry()
    r.register({ id: 'tax', label: 'Tax', description: '', pattern: '\\d{3}-\\d{2}-\\d{4}' })
    r.register({ id: 'ip', label: 'IP', description: '', pattern: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b', mask: '[ip]' })
    const compiled = r.compile()
    expect(compiled.map((c) => c.id).sort()).toEqual(['ip', 'tax'])
    expect(compiled.find((c) => c.id === 'ip')?.mask).toBe('[ip]')
  })

  it('applyPiiCategoryRegistry redacts every registered category', () => {
    const r = createPiiCategoryRegistry()
    r.register({ id: 'tax', label: 'Tax', description: '', pattern: '\\d{3}-\\d{2}-\\d{4}' })
    r.register({ id: 'phone', label: 'Phone', description: '', pattern: '\\+\\d{1,3}\\s?\\d{6,12}' })
    const out = applyPiiCategoryRegistry(
      'tax 123-45-6789 ring +1 5551234567',
      r,
    )
    expect(out).not.toContain('123-45-6789')
    expect(out).not.toContain('5551234567')
  })
})
