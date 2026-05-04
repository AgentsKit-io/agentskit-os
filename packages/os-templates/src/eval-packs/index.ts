import type { DomainPack } from '@agentskit/os-core'
import { devPack } from './dev.js'
import { agencyPack } from './agency.js'
import { clinicalPack } from './clinical.js'
import { nonTechPack } from './non-tech.js'

export { devPack, agencyPack, clinicalPack, nonTechPack }

export const BUILTIN_EVAL_PACKS: readonly DomainPack[] = [
  devPack,
  agencyPack,
  clinicalPack,
  nonTechPack,
]

export const findPack = (domain: DomainPack['domain']): DomainPack | undefined =>
  BUILTIN_EVAL_PACKS.find((p) => p.domain === domain)
