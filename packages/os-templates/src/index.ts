export type { Template, TemplateCategory, TemplateMetadata } from './types.js'
export { TemplateMetadataSchema } from './types.js'
export {
  TEMPLATES,
  builtInTemplates,
  findTemplate,
  listTemplates,
  allTags,
  allCategories,
} from './registry.js'

export { prReviewTemplate } from './templates/pr-review.js'
export { marketing3WayTemplate } from './templates/marketing-3way.js'
export { researchSummaryTemplate } from './templates/research-summary.js'
export { supportTriageTemplate } from './templates/support-triage.js'
export { clinicalConsensusTemplate } from './templates/clinical-consensus.js'
export { agencyContentApprovalTemplate } from './templates/agency-content-approval.js'

export {
  BUILTIN_EVAL_PACKS,
  findPack,
  devPack,
  agencyPack,
  clinicalPack,
  nonTechPack,
} from './eval-packs/index.js'

export {
  OFFICIAL_DOMAIN_PACK_IDS,
  OFFICIAL_DOMAIN_PACKS,
  getOfficialDomainPack,
} from './domain-packs.js'
export type { OfficialDomain, OfficialDomainPack } from './domain-packs.js'

export const PACKAGE_NAME = '@agentskit/os-templates' as const
export const PACKAGE_VERSION = '0.0.0' as const
