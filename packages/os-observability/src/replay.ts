// Replay helper — feeds a sequence of events through any number of
// EventHandlers in order. Use to run live telemetry sinks against
// historical events loaded from an audit chain or storage backend.

import type { AnyEvent, EventHandler } from '@agentskit/os-core'

export const replayEvents = async (
  events: readonly AnyEvent[],
  handlers: readonly EventHandler[],
): Promise<void> => {
  for (const ev of events) {
    for (const h of handlers) {
      await h(ev)
    }
  }
}
