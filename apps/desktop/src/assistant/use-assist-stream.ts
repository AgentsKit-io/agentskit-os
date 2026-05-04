/**
 * useAssistStream — sends a prompt to the sidecar `assistant.stream` method
 * and consumes the streaming response, writing chunks into the AssistantContext
 * via `setSuggestion`.
 *
 * TODO(Refs #92): sidecar `assistant.stream` is not yet implemented.
 * Until then we use a mock that emits a multi-word response token-by-token
 * via setInterval so the streaming UX can be developed and tested.
 */

import { useCallback, useRef } from 'react'
import { useAssistant } from './assistant-provider'
import type { AssistantTarget, AssistantSuggestion } from './assistant-types'

// ---------------------------------------------------------------------------
// Mock streaming implementation (stub until sidecar lands #92)
// ---------------------------------------------------------------------------

const MOCK_RESPONSE_WORDS = [
  'Here',
  'is',
  'a',
  'suggestion',
  'for',
  'your',
  'selection.',
  'Consider',
  'refining',
  'the',
  'configuration',
  'to',
  'improve',
  'performance',
  'and',
  'reliability.',
]

function mockStream(
  id: string,
  prompt: string,
  onChunk: (partial: string, done: boolean) => void,
  onError: (err: string) => void,
): () => void {
  void onError // suppress lint — used by real sidecar path
  let index = 0
  let accumulated = ''
  const timer = setInterval(() => {
    if (index >= MOCK_RESPONSE_WORDS.length) {
      clearInterval(timer)
      onChunk(accumulated, true)
      return
    }
    accumulated += (index === 0 ? '' : ' ') + MOCK_RESPONSE_WORDS[index]!
    index++
    onChunk(accumulated, false)
  }, 60)
  return () => clearInterval(timer)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type StreamOptions = {
  target: AssistantTarget
  prompt: string
}

export function useAssistStream(): {
  stream: (opts: StreamOptions) => void
  cancel: () => void
} {
  const { setSuggestion } = useAssistant()
  const cancelRef = useRef<(() => void) | null>(null)

  const cancel = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
  }, [])

  const stream = useCallback(
    ({ target, prompt }: StreamOptions) => {
      // Cancel any in-progress stream
      cancel()

      const id = `suggestion-${Date.now()}`
      const createdAt = new Date().toISOString()

      // Initial streaming suggestion
      setSuggestion({
        id,
        prompt,
        response: '',
        status: 'streaming',
        createdAt,
      })

      // TODO(Refs #92): Replace mockStream with a real sidecarRequest once
      // sidecar implements `assistant.stream`.
      //
      // Real implementation sketch:
      //   sidecarRequest('assistant.stream', { target, prompt }).then(...)
      //
      const stopMock = mockStream(
        id,
        prompt,
        (partial, done) => {
          const suggestion: AssistantSuggestion = {
            id,
            prompt,
            response: partial,
            status: done ? 'complete' : 'streaming',
            createdAt,
          }
          setSuggestion(suggestion)
          if (done) {
            cancelRef.current = null
          }
        },
        (_err) => {
          setSuggestion({
            id,
            prompt,
            response: 'An error occurred while generating the suggestion.',
            status: 'error',
            createdAt,
          })
          cancelRef.current = null
        },
      )

      cancelRef.current = stopMock
    },
    [setSuggestion, cancel],
  )

  return { stream, cancel }
}
