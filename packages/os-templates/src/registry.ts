import type { Template, TemplateCategory, TemplateMetadata } from './types.js'
import {
  builtInTemplates as galleryTemplates,
  TEMPLATES as galleryMetadata,
} from './gallery.js'
import { DEV_ORCHESTRATOR_TEMPLATES } from './templates/dev-orchestrator-packs.js'
import { clinicalConsensusTemplate } from './templates/clinical-consensus.js'
import { marketing3WayTemplate } from './templates/marketing-3way.js'
import { prReviewTemplate } from './templates/pr-review.js'
import { researchSummaryTemplate } from './templates/research-summary.js'
import { supportTriageTemplate } from './templates/support-triage.js'
import { TOPOLOGY_TEMPLATES } from './templates/topology-packs.js'

const legacyTemplates = [
  prReviewTemplate,
  marketing3WayTemplate,
  researchSummaryTemplate,
  supportTriageTemplate,
  clinicalConsensusTemplate,
] as const

const metadataCategoryFor = (category: TemplateCategory): TemplateMetadata['category'] => {
  if (category === 'clinical') return 'healthcare'
  if (category === 'support') return 'customer-support'
  if (category === 'marketing') return 'marketing-content'
  if (category === 'general') return 'personal-productivity'
  return category
}

const metadataForLegacyTemplate = (template: Template): TemplateMetadata => ({
  id: template.id,
  name: template.name,
  intent: template.description,
  category: metadataCategoryFor(template.category),
  tags: [...template.tags],
  estimatedCostUsd: 0.05,
  estimatedTokens: 4_000,
  primaryAgents: template.agents.map((agent) => agent.id),
  primaryTools: template.flows.flatMap((flow) =>
    flow.nodes.flatMap((node) => (node.kind === 'tool' ? [node.tool] : [])),
  ),
  runModesSupported: ['dry_run', 'preview'],
  triggerKind: (() => {
    if (template.tags.includes('webhook')) return 'webhook'
    return 'github'
  })(),
  stability: 'ready',
})

const legacyTemplatesWithMetadata: readonly Template[] = legacyTemplates.map((template) => ({
  ...template,
  metadata: metadataForLegacyTemplate(template),
}))

const packTemplatesWithMetadata: readonly Template[] = [...TOPOLOGY_TEMPLATES, ...DEV_ORCHESTRATOR_TEMPLATES].map(
  (template) => ({
    ...template,
    metadata: metadataForLegacyTemplate(template),
  }),
)

export const builtInTemplates: readonly Template[] = [
  ...legacyTemplatesWithMetadata,
  ...galleryTemplates,
  ...packTemplatesWithMetadata,
]

export const TEMPLATES: readonly TemplateMetadata[] = [
  ...legacyTemplatesWithMetadata.map((template) => template.metadata as TemplateMetadata),
  ...galleryMetadata,
  ...packTemplatesWithMetadata.map((template) => template.metadata as TemplateMetadata),
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
