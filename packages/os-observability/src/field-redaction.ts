// Per #187 — field-level trace redaction.
// Pure: caller supplies a redact fn (e.g. from `createRedactor` in #439) and
// a list of dot-path selectors. Wildcards (`*`) match any single segment.

export type FieldSelector = string

export type FieldRedactor = (s: string) => string

export type FieldRedactionConfig = {
  /** Dot-path selectors with optional `*` wildcards, e.g. `spans.*.attributes.prompt`. */
  readonly selectors: readonly FieldSelector[]
  /** Redactor for matched string values. */
  readonly redact: FieldRedactor
}

const segmentMatches = (sel: string, key: string): boolean => sel === '*' || sel === key

const matchesPath = (selectorSegments: readonly string[], path: readonly string[]): boolean => {
  if (selectorSegments.length !== path.length) return false
  for (let i = 0; i < selectorSegments.length; i += 1) {
    if (!segmentMatches(selectorSegments[i]!, path[i]!)) return false
  }
  return true
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const walk = (
  value: unknown,
  path: readonly string[],
  selectors: readonly (readonly string[])[],
  redact: FieldRedactor,
): unknown => {
  const matched = selectors.some((s) => matchesPath(s, path))
  if (matched && typeof value === 'string') {
    return redact(value)
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => walk(item, [...path, String(i)], selectors, redact))
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = walk(v, [...path, k], selectors, redact)
    }
    return out
  }
  return value
}

/**
 * Apply field-level redaction to an arbitrary trace/span record (#187).
 * Returns a new value; input is not mutated. Selectors that name a non-string
 * leaf are silently ignored (caller should not depend on coercion).
 */
export const applyFieldRedaction = <T>(record: T, config: FieldRedactionConfig): T => {
  if (config.selectors.length === 0) return record
  const parsed = config.selectors.map((s) => s.split('.').filter((p) => p.length > 0))
  return walk(record, [], parsed, config.redact) as T
}
