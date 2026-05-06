export const formatRelativeTimeNow = (nowMs: number, iso: string): string => {
  const then = new Date(iso).getTime()
  const diffMs = nowMs - then

  if (diffMs < 0) return 'just now'
  if (diffMs < 60_000) return 'just now'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  return `${Math.floor(diffMs / 86_400_000)}d ago`
}

export const formatRelativeTimeFromNow = (iso: string): string => {
  return formatRelativeTimeNow(Date.now(), iso)
}
