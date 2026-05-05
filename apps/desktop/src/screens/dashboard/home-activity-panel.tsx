import { EventFeed } from './event-feed'
import { RecentRuns } from './recent-runs'
import type { EventFeedState } from './use-event-feed'

type HomeActivityPanelProps = Pick<EventFeedState, 'events' | 'isPaused' | 'toggle'>

export function HomeActivityPanel({ events, isPaused, toggle }: HomeActivityPanelProps) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <RecentRuns runs={[]} />
      <EventFeed events={events} isPaused={isPaused} toggle={toggle} />
    </div>
  )
}

