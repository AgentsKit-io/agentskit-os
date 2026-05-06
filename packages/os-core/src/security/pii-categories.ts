// Per #201 — configurable PII category registry with plugin extension.
// Pure: defines the contract a plugin or workspace config implements to add
// custom PII categories on top of the built-in PiiCategory enum (#439).

export type PiiCategoryDefinition = {
  /** Canonical id, e.g. 'iban', 'tax-id'. */
  readonly id: string
  /** Human label rendered in the UI. */
  readonly label: string
  /** Free-text rationale for audit logs. */
  readonly description: string
  /** Regex (string form) the runtime compiles. Caller-controlled flags. */
  readonly pattern: string
  readonly flags?: string
  readonly mask?: string
}

export type PiiCategoryRegistry = {
  readonly register: (def: PiiCategoryDefinition) => 'registered' | 'conflict'
  readonly unregister: (id: string) => boolean
  readonly get: (id: string) => PiiCategoryDefinition | undefined
  readonly list: () => readonly PiiCategoryDefinition[]
  readonly compile: () => readonly { readonly id: string; readonly regex: RegExp; readonly mask: string }[]
}

const DEFAULT_MASK = '[REDACTED]'

/**
 * Build a per-workspace PII category registry (#201). Plugins call `register`
 * to add new categories; the runtime calls `compile()` once per redaction
 * pass to get a list of `{ id, regex, mask }` entries it walks the trace
 * with. Pure; caller manages scope (per-workspace, per-tenant, etc.).
 */
export const createPiiCategoryRegistry = (): PiiCategoryRegistry => {
  const byId = new Map<string, PiiCategoryDefinition>()

  return {
    register: (def) => {
      if (byId.has(def.id)) return 'conflict'
      byId.set(def.id, def)
      return 'registered'
    },
    unregister: (id) => byId.delete(id),
    get: (id) => byId.get(id),
    list: () => [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    compile: () =>
      [...byId.values()]
        .map((d) => ({
          id: d.id,
          regex: new RegExp(d.pattern, d.flags ?? 'g'),
          mask: d.mask ?? DEFAULT_MASK,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
  }
}

/** Apply every compiled category to the input string. Pure. */
export const applyPiiCategoryRegistry = (
  text: string,
  registry: PiiCategoryRegistry,
): string => {
  let out = text
  for (const c of registry.compile()) {
    out = out.replace(c.regex, c.mask)
  }
  return out
}
