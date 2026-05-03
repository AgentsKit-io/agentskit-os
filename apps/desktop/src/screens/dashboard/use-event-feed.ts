import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeEvents, type SidecarEvent } from '../../lib/sidecar'

const MAX_EVENTS = 50

export type EventFeedState = {
  events: readonly SidecarEvent[]
  isPaused: boolean
  pause: () => void
  resume: () => void
  toggle: () => void
  clear: () => void
}

/**
 * Subscribes to the sidecar event stream and keeps the last 50 events.
 * Supports pausing / resuming the feed without dropping events while paused.
 */
export function useEventFeed(): EventFeedState {
  const [events, setEvents] = useState<readonly SidecarEvent[]>([])
  const [isPaused, setIsPaused] = useState(false)

  // Buffer incoming events while paused so we can flush when resumed.
  const buffer = useRef<SidecarEvent[]>([])

  const appendEvent = useCallback((event: SidecarEvent) => {
    setIsPaused((paused) => {
      if (paused) {
        buffer.current.push(event)
      } else {
        setEvents((prev) => {
          const next = [...prev, event]
          return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next
        })
      }
      return paused
    })
  }, [])

  useEffect(() => {
    const unsub = subscribeEvents(appendEvent)
    return () => {
      unsub()
    }
  }, [appendEvent])

  const pause = useCallback(() => setIsPaused(true), [])

  const resume = useCallback(() => {
    setIsPaused(false)
    const buffered = buffer.current.splice(0)
    if (buffered.length > 0) {
      setEvents((prev) => {
        const next = [...prev, ...buffered]
        return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next
      })
    }
  }, [])

  const toggle = useCallback(() => {
    setIsPaused((paused) => {
      if (paused) {
        // flush buffer
        const buffered = buffer.current.splice(0)
        if (buffered.length > 0) {
          setEvents((prev) => {
            const next = [...prev, ...buffered]
            return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next
          })
        }
        return false
      }
      return true
    })
  }, [])

  const clear = useCallback(() => {
    buffer.current.splice(0)
    setEvents([])
  }, [])

  return { events, isPaused, pause, resume, toggle, clear }
}
