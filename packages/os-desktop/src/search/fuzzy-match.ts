/**
 * Fuzzy match scoring — pure functions, no React.
 *
 * Algorithm:
 *   1. Exact substring → score 100 (+ prefix bonus if query starts at index 0).
 *   2. Subsequence match → score based on density (matched chars / text length).
 *   3. No match → 0.
 *
 * Scores are capped; use them only for relative ordering, not absolute values.
 */

const MAX_RESULTS = 200

/**
 * Normalise a string for comparison: lower-case, collapse whitespace.
 */
export function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Compute a fuzzy match score for `query` against `text`.
 *
 * Returns 0 if there is no match, otherwise a positive integer where higher
 * means a stronger match.
 *
 * Scoring tiers:
 *   - Prefix match (query === start of text): 150
 *   - Exact substring:                         100
 *   - Subsequence match:                       1–50 (based on density)
 *
 * @param query  The user's search string (not yet normalised).
 * @param text   The candidate text to match against (not yet normalised).
 */
export function fuzzyScore(query: string, text: string): number {
  if (query.length === 0) return 1

  const q = normalise(query)
  const t = normalise(text)

  if (q.length === 0) return 1
  if (t.length === 0) return 0

  // Prefix bonus: query matches the very beginning
  if (t.startsWith(q)) return 150

  // Exact substring
  if (t.includes(q)) return 100

  // Subsequence check — every char in q must appear in t in order
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }

  if (qi < q.length) return 0 // not a subsequence

  // Density: reward matches where matched chars are close together
  // Score = 1..50 based on ratio of query length to text length
  const density = Math.min(q.length / t.length, 1)
  return Math.max(1, Math.round(density * 50))
}

/**
 * Score a `SearchEntity`-like object (with `label` and optional `subtitle`).
 * Label is weighted higher than subtitle.
 */
export function scoreEntity(
  query: string,
  entity: { readonly label: string; readonly subtitle?: string },
): number {
  const labelScore = fuzzyScore(query, entity.label) * 2
  if (labelScore > 0) return labelScore

  if (entity.subtitle) {
    const subScore = fuzzyScore(query, entity.subtitle)
    if (subScore > 0) return subScore
  }

  return 0
}

/**
 * Filter and rank an array of entities by fuzzy score.
 * Returns at most `MAX_RESULTS` results, sorted by score descending.
 */
export function fuzzyFilter<T extends { readonly label: string; readonly subtitle?: string }>(
  query: string,
  entities: readonly T[],
): T[] {
  const q = query.trim()

  if (q.length === 0) {
    return entities.slice(0, MAX_RESULTS) as T[]
  }

  return entities
    .map((e) => ({ entity: e, score: scoreEntity(q, e) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ entity }) => entity)
}
