import { Badge, Card, CardContent, CardHeader, CardTitle } from '@agentskit/os-ui'
import { formatClockTime, formatShortDuration, formatUsd } from '../../lib/format'
import type { RunMode } from '../../lib/sidecar'
import { formatHms } from '../../lib/time'
import { formatShortDuration } from '../../lib/format'

export type RunRecord = {
  readonly id: string
  readonly flow: string
  readonly mode: RunMode
  readonly status: 'success' | 'error' | 'running' | 'cancelled'
  readonly startedAt: string
  readonly durationMs: number
  readonly costUsd: number
}

const STATUS_VARIANT: Record<RunRecord['status'], 'default' | 'accent' | 'outline'> = {
  success: 'accent',
  error: 'default',
  running: 'outline',
  cancelled: 'default',
}

type RecentRunsProps = {
  runs: readonly RunRecord[]
}

export function RecentRuns({ runs }: RecentRunsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent runs</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-[var(--ag-ink-muted)]">
              No runs yet. Start an agent to see activity here.
            </p>
            <a
              href="https://www.agentskit.io/docs/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ag-accent)] underline-offset-4 hover:underline"
            >
              Get started →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ag-line)] text-left text-xs uppercase tracking-wide text-[var(--ag-ink-subtle)]">
                  <th className="pb-2 pr-4 font-medium">ID</th>
                  <th className="pb-2 pr-4 font-medium">Flow</th>
                  <th className="pb-2 pr-4 font-medium">Mode</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Started</th>
                  <th className="pb-2 pr-4 font-medium">Duration</th>
                  <th className="pb-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-[var(--ag-line-soft)] text-[var(--ag-ink)] last:border-0 hover:bg-[var(--ag-panel-alt)]"
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs text-[var(--ag-ink-muted)]">
                      {run.id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 pr-4">{run.flow}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant="outline">{run.mode}</Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={STATUS_VARIANT[run.status]}>{run.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-[var(--ag-ink-muted)]">
                      {formatClockTime(run.startedAt)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {formatShortDuration(run.durationMs)}
                    </td>
                    <td className="py-2.5 tabular-nums text-[var(--ag-ink-muted)]">
                      {formatUsd(run.costUsd, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
