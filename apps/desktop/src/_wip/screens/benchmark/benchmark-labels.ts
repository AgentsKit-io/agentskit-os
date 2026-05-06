import type { BenchmarkProvider, BenchmarkStatus } from './use-benchmarks'

export const BENCHMARK_PROVIDER_LABEL: Record<BenchmarkProvider, string> = {
  codex: 'Codex',
  claude: 'Claude',
  cursor: 'Cursor',
  gemini: 'Gemini',
}

export const BENCHMARK_STATUS_LABEL: Record<BenchmarkStatus, string> = {
  complete: 'Complete',
  running: 'Running',
  failed: 'Failed',
}
