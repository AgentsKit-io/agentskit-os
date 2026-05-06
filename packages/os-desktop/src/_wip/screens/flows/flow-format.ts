import type { FlowTrigger } from './use-flows'
export { formatDateTime as formatDate, formatDuration } from '../../lib/format'

export const TRIGGER_LABEL: Record<FlowTrigger, string> = {
  cron: 'Cron',
  manual: 'Manual',
  pull_request: 'Pull request',
  slack: 'Slack',
  webhook: 'Webhook',
}
