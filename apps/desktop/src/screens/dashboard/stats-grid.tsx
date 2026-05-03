import { Card, CardContent, CardHeader, CardTitle } from '@agentskit/os-ui'
import type { DashboardStats } from './use-dashboard-stats'

type StatCardProps = {
  title: string
  value: string
  sub: string
  isLoading: boolean
}

function StatCard({ title, value, sub, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-[var(--ag-ink-muted)]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`text-3xl font-semibold tabular-nums tracking-tight text-[var(--ag-ink)] transition-opacity ${
            isLoading ? 'opacity-40' : 'opacity-100'
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-[var(--ag-ink-subtle)]">{sub}</p>
      </CardContent>
    </Card>
  )
}

type StatsGridProps = {
  stats: DashboardStats
  isLoading: boolean
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  const costFormatted = `$${stats.liveCostUsd.toFixed(4)}`
  const latencyFormatted =
    stats.avgLatencyMs === 0 ? '—' : `${stats.avgLatencyMs.toFixed(0)} ms`
  const errorFormatted =
    stats.errorRatePct === 0 ? '0%' : `${stats.errorRatePct.toFixed(1)}%`

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total runs (24 h)"
        value={String(stats.totalRuns24h)}
        sub="agent runs in the last 24 hours"
        isLoading={isLoading}
      />
      <StatCard
        title="Live cost"
        value={costFormatted}
        sub="USD accumulated this session"
        isLoading={isLoading}
      />
      <StatCard
        title="Avg latency"
        value={latencyFormatted}
        sub="mean run duration"
        isLoading={isLoading}
      />
      <StatCard
        title="Error rate"
        value={errorFormatted}
        sub="failed runs / total runs"
        isLoading={isLoading}
      />
    </div>
  )
}
