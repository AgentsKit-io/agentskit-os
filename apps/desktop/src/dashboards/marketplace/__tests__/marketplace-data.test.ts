/**
 * Tests for marketplace-data.ts
 *
 * Covers:
 *   - CURATED_TEMPLATES has exactly 3 entries
 *   - Each template passes DashboardTemplateSchema validation
 *   - Each template's layout has at least 1 widget
 *   - Template IDs are unique
 *   - Template names match expected values
 */

import { describe, it, expect } from 'vitest'
import { CURATED_TEMPLATES } from '../marketplace-data'
import { DashboardTemplateSchema } from '../marketplace-types'

describe('CURATED_TEMPLATES', () => {
  it('contains exactly 3 curated templates', () => {
    expect(CURATED_TEMPLATES).toHaveLength(3)
  })

  it('all templates pass Zod schema validation', () => {
    for (const template of CURATED_TEMPLATES) {
      const result = DashboardTemplateSchema.safeParse(template)
      expect(result.success, `Template "${template.id}" failed validation: ${
        result.success ? '' : JSON.stringify(result.error.flatten())
      }`).toBe(true)
    }
  })

  it('all templates have at least 1 widget in their layout', () => {
    for (const template of CURATED_TEMPLATES) {
      expect(template.layout.widgets.length).toBeGreaterThan(0)
    }
  })

  it('all template IDs are unique', () => {
    const ids = CURATED_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('contains the expected template names', () => {
    const names = CURATED_TEMPLATES.map((t) => t.name)
    expect(names).toContain('Cost watch')
    expect(names).toContain('Run health')
    expect(names).toContain('Latency dashboard')
  })
})
