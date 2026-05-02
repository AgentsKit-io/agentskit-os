import type { Template, TemplateCategory } from './types.js'
import { prReviewTemplate } from './templates/pr-review.js'
import { marketing3WayTemplate } from './templates/marketing-3way.js'
import { researchSummaryTemplate } from './templates/research-summary.js'
import { supportTriageTemplate } from './templates/support-triage.js'
import { clinicalConsensusTemplate } from './templates/clinical-consensus.js'

export const builtInTemplates: readonly Template[] = [
  prReviewTemplate,
  marketing3WayTemplate,
  researchSummaryTemplate,
  supportTriageTemplate,
  clinicalConsensusTemplate,
]

export const findTemplate = (
  id: string,
  registry: readonly Template[] = builtInTemplates,
): Template | undefined => registry.find((t) => t.id === id)

export const listTemplates = (
  filter: { category?: TemplateCategory; tag?: string } = {},
  registry: readonly Template[] = builtInTemplates,
): readonly Template[] =>
  registry.filter((t) => {
    if (filter.category !== undefined && t.category !== filter.category) return false
    if (filter.tag !== undefined && !t.tags.includes(filter.tag)) return false
    return true
  })

export const allTags = (registry: readonly Template[] = builtInTemplates): readonly string[] => {
  const set = new Set<string>()
  for (const t of registry) for (const tag of t.tags) set.add(tag)
  return [...set].sort()
}

export const allCategories = (
  registry: readonly Template[] = builtInTemplates,
): readonly TemplateCategory[] => {
  const set = new Set<TemplateCategory>()
  for (const t of registry) set.add(t.category)
  return [...set]
}
