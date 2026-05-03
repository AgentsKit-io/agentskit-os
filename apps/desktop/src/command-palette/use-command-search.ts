/**
 * Fuzzy command search hook.
 *
 * `searchCommands` is a pure function so it can be tested without React.
 * The hook version is a thin convenience wrapper for component use.
 */

import { useMemo } from 'react'
import type { Command } from './commands'

const MAX_RESULTS = 25

/**
 * Normalise a string for comparison: lower-case, collapse whitespace.
 */
function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Cheap fuzzy match: every character in `query` must appear in `text`
 * in order (subsequence check). Returns a score — higher = better.
 */
function fuzzyScore(query: string, text: string): number {
  if (query.length === 0) return 1
  const q = normalise(query)
  const t = normalise(text)

  // Exact substring is highest priority
  if (t.includes(q)) return 3

  // Subsequence check
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  if (qi === q.length) return 1

  return 0
}

/**
 * Score a command against the query by checking label + keywords.
 * Returns 0 if no match.
 */
function scoreCommand(query: string, command: Command): number {
  if (query.length === 0) return 1

  const labelScore = fuzzyScore(query, command.label) * 2 // label weighted higher
  if (labelScore > 0) return labelScore

  for (const kw of command.keywords) {
    const kwScore = fuzzyScore(query, kw)
    if (kwScore > 0) return kwScore
  }

  return 0
}

/**
 * Pure fuzzy search. Returns up to `MAX_RESULTS` matching commands sorted by
 * score desc, then by original order.
 */
export function searchCommands(query: string, commands: Command[]): Command[] {
  if (commands.length === 0) return []

  const q = query.trim()

  if (q.length === 0) {
    return commands.slice(0, MAX_RESULTS)
  }

  const scored = commands
    .map((cmd) => ({ cmd, score: scoreCommand(q, cmd) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, MAX_RESULTS).map(({ cmd }) => cmd)
}

/**
 * React hook wrapping `searchCommands` with `useMemo`.
 */
export function useCommandSearch(query: string, commands: Command[]): Command[] {
  return useMemo(() => searchCommands(query, commands), [query, commands])
}
