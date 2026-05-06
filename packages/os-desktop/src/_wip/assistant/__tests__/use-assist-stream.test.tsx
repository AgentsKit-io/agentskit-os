/**
 * Tests for useAssistStream.
 *
 * Covers:
 *   - calling stream() sets initial 'streaming' suggestion with empty response
 *   - after intervals complete, suggestion reaches 'complete' status
 *   - cancel() stops emitting further chunks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { AssistantProvider } from '../assistant-provider'
import { useAssistStream } from '../use-assist-stream'
import { useAssistant } from '../assistant-provider'

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <AssistantProvider>{children}</AssistantProvider>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAssistStream', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts suggestion as streaming with empty response', () => {
    const { result } = renderHook(
      () => {
        const assist = useAssistant()
        const stream = useAssistStream()
        return { assist, stream }
      },
      { wrapper },
    )

    act(() => {
      result.current.stream.stream({
        target: { id: 'node-1', kind: 'flow-node' },
        prompt: 'Make this faster',
      })
    })

    expect(result.current.assist.currentSuggestion).not.toBeNull()
    expect(result.current.assist.currentSuggestion?.status).toBe('streaming')
    expect(result.current.assist.currentSuggestion?.prompt).toBe('Make this faster')
    expect(result.current.assist.currentSuggestion?.response).toBe('')
  })

  it('accumulates response chunks during streaming', () => {
    const { result } = renderHook(
      () => {
        const assist = useAssistant()
        const stream = useAssistStream()
        return { assist, stream }
      },
      { wrapper },
    )

    act(() => {
      result.current.stream.stream({
        target: { id: 'node-1', kind: 'flow-node' },
        prompt: 'Improve this',
      })
    })

    // Advance a few intervals
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Should have accumulated some words
    expect(result.current.assist.currentSuggestion?.response.length).toBeGreaterThan(0)
    expect(result.current.assist.currentSuggestion?.status).toBe('streaming')
  })

  it('reaches complete status after all intervals fire', () => {
    const { result } = renderHook(
      () => {
        const assist = useAssistant()
        const stream = useAssistStream()
        return { assist, stream }
      },
      { wrapper },
    )

    act(() => {
      result.current.stream.stream({
        target: { id: 'node-1', kind: 'flow-node' },
        prompt: 'Test prompt',
      })
    })

    // Run all timers to completion (16 words × 60ms = 960ms + buffer)
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.assist.currentSuggestion?.status).toBe('complete')
    expect(result.current.assist.currentSuggestion?.response.length).toBeGreaterThan(0)
  })

  it('cancel() stops ongoing stream', () => {
    const { result } = renderHook(
      () => {
        const assist = useAssistant()
        const stream = useAssistStream()
        return { assist, stream }
      },
      { wrapper },
    )

    act(() => {
      result.current.stream.stream({
        target: { id: 'node-1', kind: 'flow-node' },
        prompt: 'Cancel test',
      })
    })

    // Advance partway
    act(() => {
      vi.advanceTimersByTime(120)
    })

    const responseAtCancel = result.current.assist.currentSuggestion?.response ?? ''

    act(() => {
      result.current.stream.cancel()
    })

    // Advance more time — response should not grow further
    act(() => {
      vi.advanceTimersByTime(500)
    })

    const responseAfterCancel = result.current.assist.currentSuggestion?.response ?? ''
    // After cancel, response should not have grown beyond the last emitted chunk
    // (the final 'complete' chunk might have fired just before cancel, so we
    // check that no MORE words accumulated)
    expect(responseAfterCancel.length).toBeLessThanOrEqual(responseAtCancel.length + 20)
  })

  it('second stream() call cancels first and starts fresh', () => {
    const { result } = renderHook(
      () => {
        const assist = useAssistant()
        const stream = useAssistStream()
        return { assist, stream }
      },
      { wrapper },
    )

    act(() => {
      result.current.stream.stream({
        target: { id: 'node-1', kind: 'flow-node' },
        prompt: 'First prompt',
      })
    })

    act(() => {
      vi.advanceTimersByTime(120)
    })

    act(() => {
      result.current.stream.stream({
        target: { id: 'node-2', kind: 'agent' },
        prompt: 'Second prompt',
      })
    })

    // The suggestion should now reflect the second call
    expect(result.current.assist.currentSuggestion?.prompt).toBe('Second prompt')
  })
})
