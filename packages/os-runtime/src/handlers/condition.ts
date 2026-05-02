import type { NodeHandler } from '@agentskit/os-flow'

export type ConditionEvaluator = (
  expression: string,
  scope: Record<string, unknown>,
) => boolean | Promise<boolean>

// Default safe-ish evaluator: literal-equality + truthy refs against an
// explicit scope. Real flows ship a sandboxed evaluator (jsonata, jmespath,
// vm-based) registered via plugin.
export const safeBooleanEval: ConditionEvaluator = (expression, scope) => {
  const trimmed = expression.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return Boolean(scope[trimmed])
  }
  const match = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*==\s*(.+)$/.exec(trimmed)
  if (match) {
    const lhsKey = match[1]!
    const rhsRaw = match[2]!.trim()
    const lhs = scope[lhsKey]
    if (
      (rhsRaw.startsWith("'") && rhsRaw.endsWith("'")) ||
      (rhsRaw.startsWith('"') && rhsRaw.endsWith('"'))
    ) {
      return lhs === rhsRaw.slice(1, -1)
    }
    if (rhsRaw === 'true') return lhs === true
    if (rhsRaw === 'false') return lhs === false
    if (/^-?\d+(\.\d+)?$/.test(rhsRaw)) return lhs === Number(rhsRaw)
    return false
  }
  return false
}

export const createConditionHandler = (
  evaluator: ConditionEvaluator = safeBooleanEval,
  scopeProvider: (ctx: { runId: string }) => Record<string, unknown> = () => ({}),
): NodeHandler<'condition'> => {
  return async (node, input, ctx) => {
    const scope: Record<string, unknown> = {
      ...scopeProvider(ctx),
      ...(typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}),
    }
    try {
      const result = await evaluator(node.expression, scope)
      return { kind: 'ok', value: Boolean(result) }
    } catch (err) {
      return {
        kind: 'failed',
        error: { code: 'condition.threw', message: (err as Error).message ?? String(err) },
      }
    }
  }
}
