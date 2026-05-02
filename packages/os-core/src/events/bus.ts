// EventBus contract + in-memory implementation per ADR-0005.
// Pure interface, no transport. Higher packages plug in cross-process backends.

import type { AnyEvent } from './event.js'

export type EventHandler = (event: AnyEvent) => void | Promise<void>

export type Subscription = { readonly unsubscribe: () => void }

export interface EventBus {
  publish(event: AnyEvent): Promise<void>
  subscribe(typePattern: string, handler: EventHandler): Subscription
  close(): Promise<void>
}

const matchPattern = (pattern: string, type: string): boolean => {
  if (pattern === '*' || pattern === type) return true
  if (!pattern.includes('*')) return false
  const pSeg = pattern.split('.')
  const tSeg = type.split('.')
  for (let i = 0; i < pSeg.length; i++) {
    const p = pSeg[i]
    if (p === '*') {
      if (i === pSeg.length - 1) return true
      if (tSeg[i] === undefined) return false
      continue
    }
    if (tSeg[i] !== p) return false
  }
  return pSeg.length === tSeg.length
}

export class InMemoryEventBus implements EventBus {
  private subs = new Map<symbol, { pattern: string; handler: EventHandler }>()
  private closed = false
  private readonly errorSink: (err: unknown, event: AnyEvent, pattern: string) => void

  constructor(opts?: { onHandlerError?: (err: unknown, event: AnyEvent, pattern: string) => void }) {
    this.errorSink = opts?.onHandlerError ?? (() => undefined)
  }

  async publish(event: AnyEvent): Promise<void> {
    if (this.closed) throw new Error('event bus is closed')
    const matched = [...this.subs.values()].filter((s) => matchPattern(s.pattern, event.type))
    await Promise.all(
      matched.map(async ({ pattern, handler }) => {
        try {
          await handler(event)
        } catch (err) {
          this.errorSink(err, event, pattern)
        }
      }),
    )
  }

  subscribe(typePattern: string, handler: EventHandler): Subscription {
    if (this.closed) throw new Error('event bus is closed')
    const id = Symbol('sub')
    this.subs.set(id, { pattern: typePattern, handler })
    return {
      unsubscribe: () => {
        this.subs.delete(id)
      },
    }
  }

  async close(): Promise<void> {
    this.subs.clear()
    this.closed = true
  }

  get size(): number {
    return this.subs.size
  }
}
