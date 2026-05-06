// Per #88 — AI connection suggester.
// Pure: keyword-based heuristic that recommends integration connections
// (Slack / Stripe / Sentry / GitHub / Discord / Twilio / S3 / Postgres / etc.)
// from an agent or workflow brief. The LLM still does final-mile reasoning;
// this skeleton narrows the prompt template set deterministically.

export type ConnectionSuggestion = {
  readonly integration: string
  readonly score: number
  readonly reasons: readonly string[]
  /** Permissions the suggester anticipates the integration needs. */
  readonly suggestedPermissions: readonly string[]
}

type RuleHit = {
  readonly integration: string
  readonly weight: number
  readonly reason: string
}

const RULES: ReadonlyArray<{ keywords: readonly string[]; hit: RuleHit; perms: readonly string[] }> = [
  {
    keywords: ['slack', 'channel', 'dm', 'mention'],
    hit: { integration: 'slack', weight: 1, reason: 'mentions Slack channel/DM/mention' },
    perms: ['net:fetch:slack.com'],
  },
  {
    keywords: ['github', 'pr', 'pull request', 'issue', 'commit'],
    hit: { integration: 'github', weight: 1, reason: 'mentions GitHub PR/issue/commit' },
    perms: ['net:fetch:api.github.com'],
  },
  {
    keywords: ['stripe', 'payment', 'invoice', 'subscription'],
    hit: { integration: 'stripe', weight: 1, reason: 'mentions Stripe payment/invoice' },
    perms: ['net:fetch:api.stripe.com'],
  },
  {
    keywords: ['sentry', 'error', 'crash', 'incident'],
    hit: { integration: 'sentry', weight: 0.8, reason: 'mentions error/incident; Sentry candidate' },
    perms: ['net:fetch:sentry.io'],
  },
  {
    keywords: ['pagerduty', 'oncall', 'on-call'],
    hit: { integration: 'pagerduty', weight: 0.9, reason: 'mentions oncall/PagerDuty' },
    perms: ['net:fetch:api.pagerduty.com'],
  },
  {
    keywords: ['discord', 'guild'],
    hit: { integration: 'discord', weight: 1, reason: 'mentions Discord' },
    perms: ['net:fetch:discord.com'],
  },
  {
    keywords: ['twilio', 'sms', 'whatsapp'],
    hit: { integration: 'twilio', weight: 0.9, reason: 'mentions SMS/WhatsApp' },
    perms: ['net:fetch:api.twilio.com'],
  },
  {
    keywords: ['s3', 'bucket', 'object storage'],
    hit: { integration: 's3', weight: 0.9, reason: 'mentions S3/bucket' },
    perms: ['net:fetch:s3.amazonaws.com'],
  },
  {
    keywords: ['postgres', 'mysql', 'database', 'sql'],
    hit: { integration: 'postgres', weight: 0.7, reason: 'mentions a SQL database' },
    perms: ['net:fetch:postgres'],
  },
  {
    keywords: ['email', 'mailbox', 'inbox'],
    hit: { integration: 'email-imap', weight: 0.7, reason: 'mentions email/mailbox' },
    perms: ['net:fetch:imap'],
  },
]

const norm = (s: string): string => s.toLowerCase()

const scoreFor = (rule: typeof RULES[number], brief: string): { hit: boolean; weight: number; matches: readonly string[] } => {
  const b = norm(brief)
  const matches = rule.keywords.filter((k) => b.includes(k))
  if (matches.length === 0) return { hit: false, weight: 0, matches: [] }
  const weight = Math.min(1, rule.hit.weight + (matches.length - 1) * 0.1)
  return { hit: true, weight, matches }
}

/**
 * Suggest integration connections for a free-text brief (#88). Pure;
 * deterministic. Returns suggestions ordered by score descending.
 */
export const suggestConnections = (brief: string): readonly ConnectionSuggestion[] => {
  const out = new Map<string, ConnectionSuggestion>()
  for (const rule of RULES) {
    const r = scoreFor(rule, brief)
    if (!r.hit) continue
    const existing = out.get(rule.hit.integration)
    if (existing === undefined) {
      out.set(rule.hit.integration, {
        integration: rule.hit.integration,
        score: r.weight,
        reasons: [rule.hit.reason, ...r.matches.map((m) => `keyword:${m}`)],
        suggestedPermissions: rule.perms,
      })
    } else {
      out.set(rule.hit.integration, {
        ...existing,
        score: Math.max(existing.score, r.weight),
        reasons: [...existing.reasons, rule.hit.reason],
      })
    }
  }
  return [...out.values()].sort((a, b) => b.score - a.score)
}
