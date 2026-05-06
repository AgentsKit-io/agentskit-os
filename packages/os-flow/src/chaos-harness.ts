// Per #244 — chaos test harness.
// Pure: wraps any async fn with a fault-injection plan. Caller supplies a
// deterministic RNG + clock so test runs are reproducible.

export type ChaosFault =
  | { readonly kind: 'throw'; readonly message?: string }
  | { readonly kind: 'delay-ms'; readonly ms: number }
  | { readonly kind: 'timeout-ms'; readonly ms: number }
  | { readonly kind: 'corrupt'; readonly transform: (value: unknown) => unknown }

export type ChaosRule = {
  readonly id: string
  /** Probability 0..1 the fault fires; 1 = always when matched. */
  readonly probability: number
  /** Optional matcher on the call's tag (caller-supplied). */
  readonly matchTag?: string
  readonly fault: ChaosFault
}

export type ChaosPlan = {
  readonly rules: readonly ChaosRule[]
  readonly rng?: () => number
  readonly clock?: () => number
}

export type ChaosOutcome<T> =
  | { readonly kind: 'ok'; readonly value: T; readonly faultsFired: readonly string[] }
  | { readonly kind: 'fault'; readonly ruleId: string; readonly error: string; readonly faultsFired: readonly string[] }

const DEFAULT_RNG = (): number => Math.random()

const matches = (rule: ChaosRule, tag: string | undefined, rng: () => number): boolean => {
  if (rule.matchTag !== undefined && rule.matchTag !== tag) return false
  return rng() < rule.probability
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

const wrapWithTimeout = async <T>(p: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`chaos.timeout_after_${ms}ms`)), ms)
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * Run an async operation under a chaos plan (#244). Each rule that matches
 * may inject a fault; non-firing rules are passed through. Returns a
 * structured outcome the caller can record.
 */
export const runUnderChaos = async <T>(
  fn: () => Promise<T>,
  plan: ChaosPlan,
  opts: { readonly tag?: string } = {},
): Promise<ChaosOutcome<T>> => {
  const rng = plan.rng ?? DEFAULT_RNG
  const faultsFired: string[] = []
  for (const rule of plan.rules) {
    if (!matches(rule, opts.tag, rng)) continue
    if (rule.fault.kind === 'throw') {
      faultsFired.push(rule.id)
      return {
        kind: 'fault',
        ruleId: rule.id,
        error: rule.fault.message ?? `chaos.${rule.id}_throw`,
        faultsFired,
      }
    }
    if (rule.fault.kind === 'delay-ms') {
      faultsFired.push(rule.id)
      await sleep(rule.fault.ms)
      continue
    }
    if (rule.fault.kind === 'timeout-ms') {
      faultsFired.push(rule.id)
      try {
        const value = await wrapWithTimeout(fn(), rule.fault.ms)
        return { kind: 'ok', value, faultsFired }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { kind: 'fault', ruleId: rule.id, error: message, faultsFired }
      }
    }
    if (rule.fault.kind === 'corrupt') {
      faultsFired.push(rule.id)
      try {
        const value = (await fn()) as unknown
        return { kind: 'ok', value: rule.fault.transform(value) as T, faultsFired }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { kind: 'fault', ruleId: rule.id, error: message, faultsFired }
      }
    }
  }
  try {
    const value = await fn()
    return { kind: 'ok', value, faultsFired }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { kind: 'fault', ruleId: 'native', error: message, faultsFired }
  }
}
