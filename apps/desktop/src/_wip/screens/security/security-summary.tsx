import type { SecurityControl } from './use-security'

export function SecuritySummary({ controls }: { readonly controls: readonly SecurityControl[] }) {
  const healthy = controls.filter((control) => control.status === 'healthy').length
  const watch = controls.filter((control) => control.status === 'watch').length
  const blocked = controls.filter((control) => control.status === 'blocked').length
  const findings = controls.reduce((total, control) => total + control.findings, 0)

  const items = [
    { label: 'Healthy', value: healthy.toString() },
    { label: 'Watch', value: watch.toString() },
    { label: 'Blocked', value: blocked.toString() },
    { label: 'Findings', value: findings.toString() },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--ag-line)] bg-[var(--ag-glass-bg)] px-4 py-3 shadow-sm [backdrop-filter:var(--ag-glass-blur)]"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--ag-ink-subtle)]">
            {item.label}
          </div>
          <div className="mt-1 truncate text-xl font-semibold text-[var(--ag-ink)] tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
