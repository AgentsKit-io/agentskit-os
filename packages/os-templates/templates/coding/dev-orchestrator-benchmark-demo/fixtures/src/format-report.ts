/**
 * Tiny formatter used by the `feat-formatter` benchmark task.
 *
 * The task asks providers to add a `--pretty` mode that pretty-prints
 * the report instead of emitting compact JSON.
 */
export type DemoReport = {
  readonly providerId: string
  readonly status: string
  readonly costUsd: number
  readonly durationMs: number
}

export const formatReport = (r: DemoReport): string => JSON.stringify(r)
