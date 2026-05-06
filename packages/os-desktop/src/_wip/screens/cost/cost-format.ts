import { formatCompactNumber, formatShortDate, formatUsd } from '../../lib/format'
import type { CostBudget } from './use-cost'

export { formatUsd, formatCompactNumber as formatCostTokens, formatShortDate as formatResetDate }

export function percentUsed(budget: CostBudget): number {
  if (budget.limitUsd <= 0) return 0
  return Math.min(999, (budget.spendUsd / budget.limitUsd) * 100)
}
