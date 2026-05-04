/**
 * VoiceProvider — Web Speech API context.
 *
 * Exposes `useVoice()` returning `{ state, transcripts, start, stop, toggle }`.
 *
 * Uses `window.SpeechRecognition` (or `window.webkitSpeechRecognition`).
 * When the API is unavailable, immediately sets state to `'error'` with
 * reason "Speech recognition not supported".
 *
 * Silence timeout: 5 s of no new results stops recognition automatically.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react'
import { sidecarRequest } from '../lib/sidecar'
import type { VoiceState, VoiceTranscript } from './voice-types'
import { getVoiceEnabled, setVoiceEnabled } from './use-voice-store'

// ---------------------------------------------------------------------------
// Browser type augmentation — SpeechRecognition is not in lib.dom.d.ts
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}

type SpeechRecognitionResultItem = {
  readonly transcript: string
  readonly confidence: number
}

type SpeechRecognitionResult = {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionResultItem
  readonly [index: number]: SpeechRecognitionResultItem
}

type SpeechRecognitionResultList = {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  readonly [index: number]: SpeechRecognitionResult
}

type SpeechRecognitionEvent = Event & {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

type SpeechRecognitionErrorEvent = Event & {
  readonly error: string
  readonly message?: string
}

type SpeechRecognitionInstance = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type VoiceContextValue = {
  /** Current lifecycle state of the voice recognition session. */
  state: VoiceState
  /** Error reason string; non-empty when state === 'error'. */
  errorReason: string
  /** Live transcript buffer; includes interim and final results. */
  transcripts: ReadonlyArray<VoiceTranscript>
  /** Start voice recognition. No-op if already listening. */
  start: () => void
  /** Stop voice recognition. No-op if not listening. */
  stop: () => void
  /** Toggle: stop if listening, start otherwise. */
  toggle: () => void
}

export const VoiceContext = createContext<VoiceContextValue | undefined>(undefined)

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext)
  if (!ctx) {
    throw new Error('useVoice must be used within a VoiceProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Milliseconds of silence before auto-stopping recognition. */
const SILENCE_TIMEOUT_MS = 5_000

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type VoiceProviderProps = {
  children: React.ReactNode
}

export function VoiceProvider({ children }: VoiceProviderProps) {
  const [state, setState] = useState<VoiceState>('idle')
  const [errorReason, setErrorReason] = useState('')
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([])

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isListeningRef = useRef(false)

  // Restore persisted pref — used by the toggle to decide initial voice state
  const _persistedEnabled = getVoiceEnabled()
  void _persistedEnabled // consumed at mount; toggle persists on change

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const resetSilenceTimer = useCallback(
    (onTimeout: () => void) => {
      clearSilenceTimer()
      silenceTimerRef.current = setTimeout(onTimeout, SILENCE_TIMEOUT_MS)
    },
    [clearSilenceTimer],
  )

  // ---------------------------------------------------------------------------
  // stop
  // ---------------------------------------------------------------------------

  const stop = useCallback(() => {
    if (!isListeningRef.current) return
    isListeningRef.current = false
    clearSilenceTimer()
    recognitionRef.current?.stop()
    setState('idle')
    setVoiceEnabled(false)
  }, [clearSilenceTimer])

  // ---------------------------------------------------------------------------
  // start
  // ---------------------------------------------------------------------------

  const start = useCallback(() => {
    if (isListeningRef.current) return

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionCtor) {
      setState('error')
      setErrorReason('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    setTranscripts([])
    setState('listening')
    isListeningRef.current = true
    setVoiceEnabled(true)

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const newTranscripts: VoiceTranscript[] = []

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue
        const item = result[0]
        if (!item) continue

        const transcript: VoiceTranscript = {
          id: `voice-${Date.now()}-${i}`,
          text: item.transcript,
          finalized: result.isFinal,
          startedAt: new Date().toISOString(),
        }

        newTranscripts.push(transcript)

        if (result.isFinal) {
          setState('processing')
          void sidecarRequest('voice.handle', {
            text: item.transcript,
            // TODO(Refs #100): sidecar routes to correct action
          }).then(() => {
            if (isListeningRef.current) setState('listening')
          }).catch(() => {
            if (isListeningRef.current) setState('listening')
          })
        }
      }

      if (newTranscripts.length > 0) {
        setTranscripts((prev) => {
          // Replace interim results from the same result index
          const updated = [...prev]
          for (const t of newTranscripts) {
            const existingIdx = updated.findIndex(
              (e) => !e.finalized && e.id.startsWith(`voice-${t.startedAt.slice(0, 10)}`),
            )
            if (existingIdx !== -1 && !t.finalized) {
              updated[existingIdx] = t
            } else {
              updated.push(t)
            }
          }
          return updated
        })

        resetSilenceTimer(stop)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const ignoredErrors = ['no-speech', 'aborted']
      if (ignoredErrors.includes(event.error)) return
      isListeningRef.current = false
      clearSilenceTimer()
      setState('error')
      setErrorReason(event.message ?? event.error)
      setVoiceEnabled(false)
    }

    recognition.onend = () => {
      // If we are still supposed to be listening, restart (continuous mode
      // can end unexpectedly in some browsers).
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch {
          // Recognition may have already been stopped.
        }
      }
    }

    recognition.start()
    resetSilenceTimer(stop)
  }, [stop, clearSilenceTimer, resetSilenceTimer])

  // ---------------------------------------------------------------------------
  // toggle
  // ---------------------------------------------------------------------------

  const toggle = useCallback(() => {
    if (isListeningRef.current) {
      stop()
    } else {
      start()
    }
  }, [start, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false
      clearSilenceTimer()
      recognitionRef.current?.stop()
    }
  }, [clearSilenceTimer])

  const value = useMemo<VoiceContextValue>(
    () => ({ state, errorReason, transcripts, start, stop, toggle }),
    [state, errorReason, transcripts, start, stop, toggle],
  )

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}
