/** Shared helpers for coding-agent CLI task report artifacts (#368). */

export const putReportLink = (
  acc: Record<string, string>,
  key: 'traceUrl' | 'prUrl',
  value: string | undefined,
): void => {
  if (value === undefined) return
  const t = value.trim()
  if (t.length > 0) acc[key] = t
}
