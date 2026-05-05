export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return 'n/a'
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

