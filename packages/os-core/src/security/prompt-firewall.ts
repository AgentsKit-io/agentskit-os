// Per #443 — prompt firewall matching + corpus runner helpers (pure; no I/O).

export type PromptFirewallMatch = {
  readonly pattern: string
  readonly index: number
}

/**
 * Simple substring-based firewall (case-insensitive). This matches the current config shape
 * (string patterns) and is intentionally conservative.
 */
export const findPromptFirewallMatches = (
  prompt: string,
  blocklist: readonly string[],
  allowlistOverride: readonly string[] = [],
): readonly PromptFirewallMatch[] => {
  const p = prompt.toLowerCase()
  const allow = new Set(allowlistOverride.map((s) => s.toLowerCase()))
  const out: PromptFirewallMatch[] = []
  for (let i = 0; i < blocklist.length; i++) {
    const raw = blocklist[i] ?? ''
    const pat = raw.trim()
    if (!pat) continue
    const key = pat.toLowerCase()
    if (allow.has(key)) continue
    if (p.includes(key)) out.push({ pattern: pat, index: i })
  }
  return out
}

export type PromptFirewallDecision =
  | { readonly allow: true; readonly matches: readonly PromptFirewallMatch[] }
  | { readonly allow: false; readonly matches: readonly PromptFirewallMatch[] }

export const evaluatePromptFirewall = (args: {
  readonly enabled: boolean
  readonly rejectOnMatch: boolean
  readonly prompt: string
  readonly blocklist: readonly string[]
  readonly allowlistOverride?: readonly string[]
}): PromptFirewallDecision => {
  if (!args.enabled) return { allow: true, matches: [] }
  const matches = findPromptFirewallMatches(args.prompt, args.blocklist, args.allowlistOverride ?? [])
  if (!args.rejectOnMatch) return { allow: true, matches }
  return { allow: matches.length === 0, matches }
}

