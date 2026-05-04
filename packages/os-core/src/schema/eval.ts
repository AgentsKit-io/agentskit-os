// Per ROADMAP M3 (#340). Evaluation registry contract.
// Pure schema — runner lives in os-flow / a future os-eval package.

import { z } from 'zod'
import { Slug } from './_primitives.js'

export const EvalKind = z.enum(['threshold', 'llm_judge', 'golden_set'])
export type EvalKind = z.infer<typeof EvalKind>

export const EvalCriterion = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('threshold'),
    /** Metric the runner must produce — e.g. "accuracy", "latency_ms_p95". */
    metric: z.string().min(1).max(128),
    /** "<" | "<=" | ">" | ">=" | "==" */
    operator: z.enum(['<', '<=', '>', '>=', '==']),
    target: z.number(),
  }),
  z.object({
    kind: z.literal('llm_judge'),
    /** Rubric prompt the judge model receives. Stays in the workspace; not telemetry-exported. */
    rubric: z.string().min(1).max(8_000),
    /** Provider used for judgment. */
    judgeModel: z.object({
      provider: z.string().min(1).max(64),
      name: z.string().min(1).max(128),
    }),
    /** Pass score (0..1). */
    passThreshold: z.number().min(0).max(1),
  }),
  z.object({
    kind: z.literal('golden_set'),
    /** Path to a JSONL file of {input, expected} pairs (relative to workspace root). */
    fixturesPath: z.string().min(1).max(2048),
    /** Comparator: "exact" | "contains" | "semantic". Semantic requires a judge model. */
    comparator: z.enum(['exact', 'contains', 'semantic']),
    /** Minimum match rate (0..1). */
    passRate: z.number().min(0).max(1),
    /** Required only when comparator is "semantic". */
    judgeModel: z.object({
      provider: z.string().min(1).max(64),
      name: z.string().min(1).max(128),
    }).optional(),
  }),
])
export type EvalCriterion = z.infer<typeof EvalCriterion>

export const EvalDef = z.object({
  id: Slug,
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  /** Persona/domain this eval belongs to. */
  domain: z.enum(['dev', 'agency', 'clinical', 'non-tech', 'shared']),
  /** Agent or flow id this eval applies to. */
  appliesTo: z.object({
    agentId: Slug.optional(),
    flowId: Slug.optional(),
  }).optional(),
  criteria: z.array(EvalCriterion).min(1).max(32),
  tags: z.array(z.string().min(1).max(64)).max(64).default([]),
})
export type EvalDef = z.infer<typeof EvalDef>

export const EvalSuiteVersion = z.literal(1)

export const EvalSuite = z.object({
  schemaVersion: EvalSuiteVersion,
  id: Slug,
  name: z.string().min(1).max(128),
  /** Composes a set of evals into a runnable suite. */
  evals: z.array(EvalDef).min(1).max(256),
})
export type EvalSuite = z.infer<typeof EvalSuite>

export const DomainPack = z.object({
  schemaVersion: EvalSuiteVersion,
  domain: z.enum(['dev', 'agency', 'clinical', 'non-tech']),
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  suites: z.array(EvalSuite).min(1).max(32),
})
export type DomainPack = z.infer<typeof DomainPack>

export const EvalResultStatus = z.enum(['pass', 'fail', 'error'])
export type EvalResultStatus = z.infer<typeof EvalResultStatus>

export const EvalResult = z.object({
  evalId: Slug,
  status: EvalResultStatus,
  /** Per-criterion outcomes, parallel to EvalDef.criteria. */
  criterionResults: z.array(z.object({
    kind: EvalKind,
    passed: z.boolean(),
    score: z.number().optional(),
    detail: z.string().max(2048).optional(),
  })).max(32),
  /** Stable error code if the run errored. */
  errorCode: z.string().max(128).optional(),
  durationMs: z.number().int().nonnegative().optional(),
})
export type EvalResult = z.infer<typeof EvalResult>

export const parseEvalDef = (input: unknown): EvalDef => EvalDef.parse(input)
export const safeParseEvalDef = (input: unknown) => EvalDef.safeParse(input)
export const parseEvalSuite = (input: unknown): EvalSuite => EvalSuite.parse(input)
export const safeParseEvalSuite = (input: unknown) => EvalSuite.safeParse(input)
export const parseDomainPack = (input: unknown): DomainPack => DomainPack.parse(input)
export const safeParseDomainPack = (input: unknown) => DomainPack.safeParse(input)

/**
 * Evaluate a single threshold criterion against a measured value. Pure.
 * For llm_judge / golden_set, the runner supplies its own pass/fail
 * — this helper only handles the deterministic threshold case.
 */
export const passesThreshold = (
  criterion: Extract<EvalCriterion, { kind: 'threshold' }>,
  value: number,
): boolean => {
  switch (criterion.operator) {
    case '<': return value < criterion.target
    case '<=': return value <= criterion.target
    case '>': return value > criterion.target
    case '>=': return value >= criterion.target
    case '==': return value === criterion.target
  }
}
