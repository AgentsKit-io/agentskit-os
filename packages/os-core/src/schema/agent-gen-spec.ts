// Per #91 — NL → agent + pipeline + trigger + tools generator skeleton.
// Pure schema + heuristic extractor that converts a natural-language brief
// into a structured AgentGenSpec the runtime fills out via the LLM.

import { z } from 'zod'
import { Slug } from './_primitives.js'

export const AgentGenIntent = z.enum([
  'agent',
  'pipeline',
  'trigger',
  'tools',
  'mixed',
])
export type AgentGenIntent = z.infer<typeof AgentGenIntent>

export const AgentGenSpec = z.object({
  schemaVersion: z.literal(1).default(1),
  brief: z.string().min(1).max(8_000),
  intent: AgentGenIntent,
  /** Suggested slug seed for downstream generators. */
  suggestedSlug: Slug,
  /** Tools the brief mentioned by name (best-effort). */
  toolHints: z.array(z.string().min(1).max(128)).max(64).default([]),
  /** Trigger keywords detected (cron / webhook / slack / github / etc.). */
  triggerHints: z.array(z.string().min(1).max(64)).max(32).default([]),
  /** Domain tags used to prefilter eval packs and templates. */
  domainTags: z.array(z.string().min(1).max(64)).max(32).default([]),
})
export type AgentGenSpec = z.infer<typeof AgentGenSpec>

const TRIGGER_KEYWORDS: readonly string[] = [
  'cron', 'schedule', 'webhook', 'slack', 'github', 'pr', 'pull request',
  'email', 'discord', 'twilio', 'sentry', 'pagerduty', 'stripe', 's3',
]

const TOOL_KEYWORDS: readonly string[] = [
  'git diff', 'git', 'shell', 'fetch', 'http', 'sql', 'database',
  'notify', 'slack', 'email',
]

const DOMAIN_KEYWORDS: Readonly<Record<string, string>> = {
  finance: 'finance',
  invoice: 'finance',
  payment: 'finance',
  marketing: 'marketing',
  copy: 'marketing',
  campaign: 'marketing',
  legal: 'legal',
  contract: 'legal',
  ops: 'ops',
  incident: 'ops',
  oncall: 'ops',
  research: 'research',
  paper: 'research',
}

const guessIntent = (brief: string): AgentGenIntent => {
  const b = brief.toLowerCase()
  const wantsTrigger = /trigger|every (hour|day|week|minute)|when|whenever|cron/.test(b)
  const wantsPipeline = /pipeline|flow|step\b|then\b/.test(b)
  const wantsTools = /tool|integration|connect|use\s+(slack|github|stripe)/.test(b)
  const wantsAgent = /agent|bot|assistant/.test(b)
  const flags = [wantsTrigger, wantsPipeline, wantsTools, wantsAgent].filter(Boolean).length
  if (flags >= 2) return 'mixed'
  if (wantsTrigger) return 'trigger'
  if (wantsPipeline) return 'pipeline'
  if (wantsTools) return 'tools'
  return 'agent'
}

const slugify = (brief: string): string =>
  brief
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'gen'

const detectMatches = (brief: string, keywords: readonly string[]): readonly string[] => {
  const b = brief.toLowerCase()
  const seen = new Set<string>()
  for (const kw of keywords) {
    if (b.includes(kw)) seen.add(kw)
  }
  return [...seen].sort()
}

const detectDomains = (brief: string): readonly string[] => {
  const b = brief.toLowerCase()
  const seen = new Set<string>()
  for (const [needle, tag] of Object.entries(DOMAIN_KEYWORDS)) {
    if (b.includes(needle)) seen.add(tag)
  }
  return [...seen].sort()
}

/**
 * Heuristic NL → AgentGenSpec extractor (#91). Pure: returns the structured
 * brief the runtime feeds into an LLM for full generation. The LLM still does
 * the heavy lifting; this seed lets prompts target a narrower template set.
 */
export const extractAgentGenSpec = (brief: string): AgentGenSpec =>
  AgentGenSpec.parse({
    schemaVersion: 1,
    brief,
    intent: guessIntent(brief),
    suggestedSlug: slugify(brief),
    toolHints: detectMatches(brief, TOOL_KEYWORDS),
    triggerHints: detectMatches(brief, TRIGGER_KEYWORDS),
    domainTags: detectDomains(brief),
  })

export const parseAgentGenSpec = (input: unknown): AgentGenSpec => AgentGenSpec.parse(input)
export const safeParseAgentGenSpec = (input: unknown) => AgentGenSpec.safeParse(input)
