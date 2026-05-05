import { useEffect, useRef } from 'react'
import { Button, GlassPanel } from '@agentskit/os-ui'
import type { SidecarEvent } from '../../lib/sidecar'
import type { EventFeedState } from './use-event-feed'
import { formatHms } from '../../lib/time'

type EventFeedProps = Pick<EventFeedState, 'events' | 'isPaused' | 'toggle'>

function dataSummary(data: Record<string, unknown>): string {
  try {
    const str = JSON.stringify(data)
    return str.length > 120 ? `${str.slice(0, 120)}…` : str
  } catch {
    return '[unparseable]'
  }
}

function EventRow({ event }: { event: SidecarEvent }) {
  const time = formatHms(event.timestamp)
  return (
    <div className="flex gap-3 py-0.5 text-xs text-[var(--ag-ink-muted)]">
      <time
        dateTime={event.timestamp}
        className="shrink-0 tabular-nums text-[var(--ag-ink-subtle)]"
      >
        {time}
      </time>
      <span className="shrink-0 font-medium text-[var(--ag-accent)]">{event.type}</span>
      <span className="min-w-0 truncate text-[var(--ag-ink-muted)]">
        {dataSummary(event.data)}
      </span>
    </div>
  )
}

export function EventFeed({ events, isPaused, toggle }: EventFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new events arrive (unless paused).
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events, isPaused])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--ag-ink)]">Live event feed</h2>
        <Button variant="outline" size="sm" onClick={toggle}>
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
      </div>

      <GlassPanel className="relative" blur="sm">
        {isPaused && (
          <div className="absolute right-2 top-2 z-10 rounded-md bg-[var(--ag-panel-alt)] px-2 py-0.5 text-xs text-[var(--ag-ink-muted)] ring-1 ring-[var(--ag-line)]">
            Paused
          </div>
        )}

        <div
          ref={scrollRef}
          className="h-56 overflow-y-auto px-3 py-2 font-mono"
        >
          {events.length === 0 ? (
            <p className="pt-8 text-center text-xs text-[var(--ag-ink-subtle)]">
              Waiting for sidecar events…
            </p>
          ) : (
            events.map((event, i) => <EventRow key={i} event={event} />)
          )}
        </div>
      </GlassPanel>
    </div>
  )
}
