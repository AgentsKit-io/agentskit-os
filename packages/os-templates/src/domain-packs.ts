// Per #338 — official domain packs with policies, evals, dashboards, starter flows.
// Pure: bundles together templates + eval packs + suggested policy + dashboard
// pointers per domain. Storage / wire format owned by os-core's DomainPack;
// this module is the curated catalog the CLI surfaces during `os new`.

export type OfficialDomain = 'engineering' | 'finance' | 'marketing' | 'support' | 'clinical'

export type OfficialDomainPack = {
  readonly id: OfficialDomain
  readonly title: string
  readonly description: string
  readonly starterTemplateIds: readonly string[]
  readonly evalPackIds: readonly string[]
  readonly recommendedPolicyProfileIds: readonly string[]
  readonly dashboardWidgetIds: readonly string[]
  readonly tags: readonly string[]
}

const ENGINEERING: OfficialDomainPack = {
  id: 'engineering',
  title: 'Engineering',
  description: 'PR review, issue triage, release notes, on-call summaries.',
  starterTemplateIds: ['pr-review', 'issue-to-pr', 'research-summary'],
  evalPackIds: ['dev'],
  recommendedPolicyProfileIds: ['edit_without_shell', 'test_runner'],
  dashboardWidgetIds: ['cost-by-agent', 'pr-throughput'],
  tags: ['engineering', 'sdlc'],
}

const FINANCE: OfficialDomainPack = {
  id: 'finance',
  title: 'Finance',
  description: 'Invoice review, cost analytics, vendor onboarding.',
  starterTemplateIds: ['invoice-review', 'cost-anomaly'],
  evalPackIds: ['non-tech'],
  recommendedPolicyProfileIds: ['read_only_review'],
  dashboardWidgetIds: ['cost-heat-map', 'invoice-aging'],
  tags: ['finance', 'compliance'],
}

const MARKETING: OfficialDomainPack = {
  id: 'marketing',
  title: 'Marketing',
  description: 'Campaign briefs, copy review, agency 3-way handoff.',
  starterTemplateIds: ['marketing-3way'],
  evalPackIds: ['agency'],
  recommendedPolicyProfileIds: ['read_only_review'],
  dashboardWidgetIds: ['campaign-funnel'],
  tags: ['marketing', 'agency'],
}

const SUPPORT: OfficialDomainPack = {
  id: 'support',
  title: 'Customer Support',
  description: 'Ticket triage, response drafting, escalation routing.',
  starterTemplateIds: ['support-triage'],
  evalPackIds: ['agency'],
  recommendedPolicyProfileIds: ['read_only_review'],
  dashboardWidgetIds: ['ticket-aging', 'first-response-time'],
  tags: ['support', 'cx'],
}

const CLINICAL: OfficialDomainPack = {
  id: 'clinical',
  title: 'Clinical',
  description: 'Multi-agent consensus on clinical questions; mandatory HITL.',
  starterTemplateIds: ['clinical-consensus'],
  evalPackIds: ['clinical'],
  recommendedPolicyProfileIds: ['read_only_review'],
  dashboardWidgetIds: ['hitl-queue', 'redaction-coverage'],
  tags: ['clinical', 'compliance', 'hipaa'],
}

const BY_ID: Readonly<Record<OfficialDomain, OfficialDomainPack>> = {
  engineering: ENGINEERING,
  finance: FINANCE,
  marketing: MARKETING,
  support: SUPPORT,
  clinical: CLINICAL,
}

export const OFFICIAL_DOMAIN_PACK_IDS: readonly OfficialDomain[] = [
  'engineering',
  'finance',
  'marketing',
  'support',
  'clinical',
]

export const OFFICIAL_DOMAIN_PACKS: ReadonlyArray<OfficialDomainPack> = [
  ENGINEERING,
  FINANCE,
  MARKETING,
  SUPPORT,
  CLINICAL,
]

export const getOfficialDomainPack = (id: OfficialDomain): OfficialDomainPack => BY_ID[id]
