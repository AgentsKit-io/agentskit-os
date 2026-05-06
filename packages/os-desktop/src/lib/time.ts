export function formatHms(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatMdHms(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatMd(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

