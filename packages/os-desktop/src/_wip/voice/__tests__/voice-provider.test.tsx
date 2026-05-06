/**
 * Tests for VoiceProvider and useVoice hook.
 *
 * Covers:
 *   - Default idle state
 *   - Error state when SpeechRecognition unavailable
 *   - start() / stop() / toggle() happy paths (mocked SpeechRecognition)
 *   - Transcripts updated on onresult events
 *   - Error when useVoice used outside provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { VoiceProvider, useVoice } from '../voice-provider'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../lib/sidecar', () => ({
  sidecarRequest: vi.fn().mockResolvedValue({}),
}))

// ---------------------------------------------------------------------------
// SpeechRecognition mock factory
// ---------------------------------------------------------------------------

type MockSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  onresult: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  onend: (() => void) | null
}

function createMockSpeechRecognition(): MockSpeechRecognition {
  return {
    continuous: false,
    interimResults: false,
    lang: '',
    start: vi.fn(),
    stop: vi.fn(),
    onresult: null,
    onerror: null,
    onend: null,
  }
}

// ---------------------------------------------------------------------------
// Helper — render tree with VoiceProvider
// ---------------------------------------------------------------------------

function renderVoiceTree(child: React.ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(createElement(VoiceProvider, null, child))
  })

  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useVoice', () => {
  let originalSR: typeof window.SpeechRecognition
  let mockInstance: MockSpeechRecognition

  beforeEach(() => {
    originalSR = window.SpeechRecognition
    mockInstance = createMockSpeechRecognition()
    const instance = mockInstance
    // Must be a real constructor; proxy all reads/writes back to mockInstance
    window.SpeechRecognition = class {
      get continuous() { return instance.continuous }
      set continuous(v) { instance.continuous = v }
      get interimResults() { return instance.interimResults }
      set interimResults(v) { instance.interimResults = v }
      get lang() { return instance.lang }
      set lang(v) { instance.lang = v }
      get start() { return instance.start }
      get stop() { return instance.stop }
      get onresult() { return instance.onresult }
      set onresult(v) { instance.onresult = v }
      get onerror() { return instance.onerror }
      set onerror(v) { instance.onerror = v }
      get onend() { return instance.onend }
      set onend(v) { instance.onend = v }
    } as unknown as typeof window.SpeechRecognition
    localStorage.clear()
  })

  afterEach(() => {
    window.SpeechRecognition = originalSR
    localStorage.clear()
    vi.clearAllTimers()
  })

  it('throws when used outside VoiceProvider', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const Broken = () => {
      useVoice()
      return null
    }

    expect(() => {
      act(() => { root.render(createElement(Broken, null)) })
    }).toThrow('useVoice must be used within a VoiceProvider')

    act(() => { root.unmount() })
    container.remove()
  })

  it('starts in idle state', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))
    expect(ctx?.state).toBe('idle')
    expect(ctx?.transcripts).toHaveLength(0)
    unmount()
  })

  it('sets error state when SpeechRecognition is unavailable', () => {
    // Remove both SR constructors
    delete (window as { SpeechRecognition?: unknown }).SpeechRecognition
    delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition

    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))

    act(() => { ctx?.start() })

    expect(ctx?.state).toBe('error')
    expect(ctx?.errorReason).toBe('Speech recognition not supported')

    unmount()
  })

  it('transitions to listening on start()', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))

    act(() => { ctx?.start() })

    expect(ctx?.state).toBe('listening')
    expect(mockInstance.start).toHaveBeenCalledOnce()

    unmount()
  })

  it('returns to idle on stop()', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))

    act(() => { ctx?.start() })
    expect(ctx?.state).toBe('listening')

    act(() => { ctx?.stop() })
    expect(ctx?.state).toBe('idle')
    expect(mockInstance.stop).toHaveBeenCalledOnce()

    unmount()
  })

  it('toggle() starts when idle', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))

    act(() => { ctx?.toggle() })
    expect(ctx?.state).toBe('listening')

    unmount()
  })

  it('toggle() stops when listening', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))

    act(() => { ctx?.start() })
    expect(ctx?.state).toBe('listening')

    act(() => { ctx?.toggle() })
    expect(ctx?.state).toBe('idle')

    unmount()
  })

  it('updates transcripts on onresult with interim result', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))

    act(() => { ctx?.start() })

    // Simulate an interim speech result
    const mockEvent = {
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal: false,
          length: 1,
          0: { transcript: 'open dashboard', confidence: 0.9 },
          item: function(i: number) { return (this as unknown as Record<number, { transcript: string; confidence: number }>)[i] },
        },
        item: function(i: number) { return (this as unknown as Record<number, unknown>)[i] },
      },
    }

    act(() => {
      mockInstance.onresult?.(mockEvent)
    })

    expect(ctx?.transcripts).toHaveLength(1)
    expect(ctx?.transcripts[0]?.text).toBe('open dashboard')
    expect(ctx?.transcripts[0]?.finalized).toBe(false)

    unmount()
  })

  it('sets configured recognition options', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))
    act(() => { ctx?.start() })

    expect(mockInstance.continuous).toBe(true)
    expect(mockInstance.interimResults).toBe(true)

    unmount()
  })

  it('start() is a no-op when already listening', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))

    act(() => { ctx?.start() })
    act(() => { ctx?.start() })

    expect(mockInstance.start).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('stop() is a no-op when idle', () => {
    let ctx: ReturnType<typeof useVoice> | undefined

    const Inspector = () => {
      ctx = useVoice()
      return null
    }

    const { unmount } = renderVoiceTree(createElement(Inspector, null))

    act(() => { ctx?.stop() })
    expect(ctx?.state).toBe('idle')
    expect(mockInstance.stop).not.toHaveBeenCalled()

    unmount()
  })
})
