import { BENCHMARK_STATUS_LABEL } from './benchmark-labels'
import type { BenchmarkStatus } from './use-benchmarks'

const STATUS_TOKEN: Record<BenchmarkStatus, string> = {
  complete: 'border-[color-mix(in_srgb,var(--ag-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-success)_12%,transparent)] text-[var(--ag-success)]',
  running: 'border-[color-mix(in_srgb,var(--ag-accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-accent)_12%,transparent)] text-[var(--ag-accent)]',
  failed: 'border-[color-mix(in_srgb,var(--ag-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--ag-danger)_12%,transparent)] text-[var(--ag-danger)]',
}

export function BenchmarkStatusPill({ status }: { readonly status: BenchmarkStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-medium ${STATUS_TOKEN[status]}`}
    >
      {BENCHMARK_STATUS_LABEL[status]}
    </span>
  )
}
