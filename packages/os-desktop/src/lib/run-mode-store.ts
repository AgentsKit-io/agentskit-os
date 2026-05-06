import type { RunMode } from './sidecar'

const KEY = 'agentskitos.runMode'

export function getRunMode(): RunMode {
  if (typeof window === 'undefined') return 'preview'
  const value = window.localStorage.getItem(KEY)
  if (value === 'real' || value === 'preview' || value === 'dry_run' || value === 'sandbox') return value
  return 'preview'
}

export function setRunMode(mode: RunMode): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, mode)
}

