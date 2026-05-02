// Pure structural diff for ConfigRoot (or any config slice).
// Produces a flat list of typed change ops keyed by dot-path.

export type ConfigChangeOp =
  | { kind: 'add'; path: string; value: unknown }
  | { kind: 'remove'; path: string; previous: unknown }
  | { kind: 'replace'; path: string; previous: unknown; value: unknown }

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype

const sameValue = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!sameValue(a[i], b[i])) return false
    }
    return true
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    for (const k of aKeys) {
      if (!sameValue(a[k], b[k])) return false
    }
    return true
  }
  return false
}

const walk = (
  prev: unknown,
  next: unknown,
  path: string,
  out: ConfigChangeOp[],
): void => {
  if (sameValue(prev, next)) return

  const prevIsObj = isPlainObject(prev)
  const nextIsObj = isPlainObject(next)

  if (prev === undefined && next !== undefined) {
    out.push({ kind: 'add', path, value: next })
    return
  }
  if (next === undefined && prev !== undefined) {
    out.push({ kind: 'remove', path, previous: prev })
    return
  }
  if (!prevIsObj || !nextIsObj) {
    out.push({ kind: 'replace', path, previous: prev, value: next })
    return
  }

  const keys = new Set<string>([...Object.keys(prev), ...Object.keys(next)])
  for (const key of keys) {
    walk(prev[key], next[key], path === '' ? key : `${path}.${key}`, out)
  }
}

export const diffConfigs = (prev: unknown, next: unknown): readonly ConfigChangeOp[] => {
  const out: ConfigChangeOp[] = []
  walk(prev, next, '', out)
  return out
}
