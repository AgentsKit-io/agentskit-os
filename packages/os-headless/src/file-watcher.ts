// Phase A-4 — file watcher daemon for FileWatchTrigger.
// Wraps node:fs.watch with a debounce window so a single editor save fires
// once. Caller supplies dispatch fn; daemon owns the watcher lifecycle.

import { watch } from 'node:fs/promises'
import { join } from 'node:path'

import type { FileWatchTrigger } from '@agentskit/os-core'

export type FileWatchDispatch = (
  trigger: { id: string; flow: string; receivedAt: number; payload: unknown },
) => void

export type FileWatchDaemonOpts = {
  readonly trigger: FileWatchTrigger
  readonly dispatch: FileWatchDispatch
  readonly debounceMs?: number
}

export type FileWatchDaemon = {
  readonly start: () => Promise<void>
  readonly stop: () => Promise<void>
}

const DEFAULT_DEBOUNCE_MS = 250

const matchesEvent = (
  trigger: FileWatchTrigger,
  fsEventType: 'rename' | 'change' | string,
): boolean => {
  if (fsEventType === 'change') return trigger.events.includes('change')
  if (fsEventType === 'rename') return trigger.events.includes('add') || trigger.events.includes('unlink')
  return false
}

/**
 * Build a file watch daemon that dispatches once per debounce window.
 * Caller drives `start` / `stop`; the underlying AsyncIterable is consumed
 * lazily.
 */
export const createFileWatchDaemon = (opts: FileWatchDaemonOpts): FileWatchDaemon => {
  const debounce = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS
  let abort: AbortController | null = null
  let pendingTimer: ReturnType<typeof setTimeout> | null = null
  let pendingPayload: { kind: string; filename: string } | null = null

  const flush = () => {
    if (pendingPayload === null) return
    opts.dispatch({
      id: opts.trigger.id,
      flow: opts.trigger.flow,
      receivedAt: Date.now(),
      payload: { ...pendingPayload, path: opts.trigger.path },
    })
    pendingPayload = null
  }

  const schedule = (kind: string, filename: string) => {
    pendingPayload = { kind, filename }
    if (pendingTimer !== null) clearTimeout(pendingTimer)
    pendingTimer = setTimeout(flush, debounce)
  }

  return {
    start: async () => {
      abort = new AbortController()
      const watcher = watch(opts.trigger.path, { signal: abort.signal, recursive: false })
      void (async () => {
        try {
          for await (const ev of watcher) {
            if (!matchesEvent(opts.trigger, ev.eventType)) continue
            const filename = ev.filename ?? ''
            if (opts.trigger.glob !== undefined) {
              const candidate = filename.length > 0 ? join(opts.trigger.path, filename) : opts.trigger.path
              if (!candidate.includes(opts.trigger.glob.replace(/\*/g, ''))) continue
            }
            schedule(ev.eventType, filename)
          }
        } catch {
          /* aborted */
        }
      })()
    },
    stop: async () => {
      if (pendingTimer !== null) clearTimeout(pendingTimer)
      pendingTimer = null
      pendingPayload = null
      if (abort !== null) abort.abort()
      abort = null
    },
  }
}
