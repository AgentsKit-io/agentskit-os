// Pure ${vault:key} reference scanning + substitution.
// Async resolver pluggable — caller provides (key) => Promise<string | undefined>.
// Refs only ever appear in string leaves; arrays/objects walked recursively.

const VAULT_REF_RE = /\$\{vault:([a-z0-9_]+)\}/g

export type VaultResolver = (key: string) => string | undefined | Promise<string | undefined>

export type ResolveResult<T = unknown> = {
  readonly output: T
  readonly resolvedKeys: readonly string[]
  readonly missingKeys: readonly string[]
}

export const findVaultRefs = (input: unknown): readonly string[] => {
  const found = new Set<string>()
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      let match: RegExpExecArray | null
      VAULT_REF_RE.lastIndex = 0
      while ((match = VAULT_REF_RE.exec(v)) !== null) {
        found.add(match[1]!)
      }
      return
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item)
      return
    }
    if (typeof v === 'object' && v !== null) {
      for (const key of Object.keys(v)) walk((v as Record<string, unknown>)[key])
    }
  }
  walk(input)
  return [...found]
}

export const resolveVaultRefs = async <T>(
  input: T,
  resolver: VaultResolver,
): Promise<ResolveResult<T>> => {
  const resolved = new Set<string>()
  const missing = new Set<string>()
  const cache = new Map<string, string | undefined>()

  const lookup = async (key: string): Promise<string | undefined> => {
    if (cache.has(key)) return cache.get(key)
    const v = await resolver(key)
    cache.set(key, v)
    if (v === undefined) {
      missing.add(key)
    } else {
      resolved.add(key)
    }
    return v
  }

  const substitute = async (s: string): Promise<string> => {
    const refs: { key: string; full: string }[] = []
    let match: RegExpExecArray | null
    VAULT_REF_RE.lastIndex = 0
    while ((match = VAULT_REF_RE.exec(s)) !== null) {
      refs.push({ key: match[1]!, full: match[0]! })
    }
    if (refs.length === 0) return s
    let out = s
    for (const { key, full } of refs) {
      const value = await lookup(key)
      if (value === undefined) continue
      out = out.split(full).join(value)
    }
    return out
  }

  const walk = async (v: unknown): Promise<unknown> => {
    if (typeof v === 'string') return substitute(v)
    if (Array.isArray(v)) {
      const out: unknown[] = []
      for (const item of v) out.push(await walk(item))
      return out
    }
    if (typeof v === 'object' && v !== null) {
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(v)) {
        out[key] = await walk((v as Record<string, unknown>)[key])
      }
      return out
    }
    return v
  }

  const output = (await walk(input)) as T
  return { output, resolvedKeys: [...resolved], missingKeys: [...missing] }
}
