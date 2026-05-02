// Layered config merge per ADR-0003.
// Pure object operations only — no FS, no I/O.
// Loaders (TS / YAML / GUI / env / CLI) live in higher packages and feed objects here.

export const CONFIG_LAYERS = [
  'defaults',
  'global',
  'workspace',
  'env',
  'runtime',
] as const

export type ConfigLayer = (typeof CONFIG_LAYERS)[number]

export type DeepPartial<T> = T extends object
  ? T extends ReadonlyArray<unknown>
    ? T
    : { [K in keyof T]?: DeepPartial<T[K]> }
  : T

export type ConfigInputs<T> = {
  readonly [K in ConfigLayer]?: DeepPartial<T>
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype

const mergePair = (base: unknown, over: unknown): unknown => {
  if (over === undefined) return base
  if (Array.isArray(over)) return over // arrays replace, not merge (ADR-0003)
  if (!isPlainObject(over)) return over
  if (!isPlainObject(base)) return { ...over }
  const out: Record<string, unknown> = { ...base }
  for (const key of Object.keys(over)) {
    out[key] = mergePair(base[key], over[key])
  }
  return out
}

export const mergeLayers = <T>(inputs: ConfigInputs<T>): DeepPartial<T> => {
  let acc: unknown = undefined
  for (const layer of CONFIG_LAYERS) {
    const v = inputs[layer]
    if (v === undefined) continue
    acc = mergePair(acc, v)
  }
  return (acc ?? {}) as DeepPartial<T>
}

export type ProvenanceEntry = { layer: ConfigLayer; path: readonly (string | number)[] }
export type ProvenanceMap = ReadonlyMap<string, ProvenanceEntry>

const pathKey = (path: readonly (string | number)[]): string => path.join('.')

const collectLeaves = (
  v: unknown,
  layer: ConfigLayer,
  path: (string | number)[],
  out: Map<string, ProvenanceEntry>,
): void => {
  if (Array.isArray(v) || !isPlainObject(v)) {
    out.set(pathKey(path), { layer, path: [...path] })
    return
  }
  for (const key of Object.keys(v)) {
    collectLeaves(v[key], layer, [...path, key], out)
  }
}

export const buildProvenance = <T>(inputs: ConfigInputs<T>): ProvenanceMap => {
  const out = new Map<string, ProvenanceEntry>()
  for (const layer of CONFIG_LAYERS) {
    const v = inputs[layer]
    if (v === undefined) continue
    collectLeaves(v, layer, [], out)
  }
  return out
}
