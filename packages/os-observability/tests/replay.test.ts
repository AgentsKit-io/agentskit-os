import { describe, expect, it } from 'vitest'
import type { AnyEvent } from '@agentskit/os-core'
import { createLogSink, replayEvents, type LogLine, type LogWriter } from '../src/index.js'
import { fakeEvent } from './_helpers.js'

const collector = (): LogWriter & { lines: LogLine[] } => {
  const lines: LogLine[] = []
  return { lines, write: (l) => { lines.push(l) } }
}

describe('replayEvents', () => {
  it('feeds events through every handler in order', async () => {
    const seen: string[] = []
    await replayEvents(
      [fakeEvent({ id: '1' as never }), fakeEvent({ id: '2' as never })],
      [
        async (e: AnyEvent) => { seen.push(`a:${e.id}`) },
        async (e: AnyEvent) => { seen.push(`b:${e.id}`) },
      ],
    )
    expect(seen).toEqual(['a:1', 'b:1', 'a:2', 'b:2'])
  })

  it('replays into a log sink as if from a live bus', async () => {
    const w = collector()
    await replayEvents(
      [
        fakeEvent({ type: 'agent.task.completed' }),
        fakeEvent({ type: 'flow.node.failed' }),
      ],
      [createLogSink({ writer: w })],
    )
    expect(w.lines.map((l) => l.level)).toEqual(['info', 'error'])
  })

  it('handles empty inputs', async () => {
    await expect(replayEvents([], [])).resolves.toBeUndefined()
    await expect(replayEvents([fakeEvent()], [])).resolves.toBeUndefined()
  })
})
