export type { Template, TemplateCategory } from './types.js'
export {
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

export {
  BUILTIN_EVAL_PACKS,
  findPack,
  devPack,
  agencyPack,
  clinicalPack,
  nonTechPack,
} from './eval-packs/index.js'

export const PACKAGE_NAME = '@agentskit/os-templates' as const
export const PACKAGE_VERSION = '0.0.0' as const
