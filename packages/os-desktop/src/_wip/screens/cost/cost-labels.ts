import type { BudgetStatus, CostProvider } from './use-cost'

export const COST_PROVIDER_LABEL: Record<CostProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  cursor: 'Cursor',
}

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  exceeded: 'Exceeded',
}
