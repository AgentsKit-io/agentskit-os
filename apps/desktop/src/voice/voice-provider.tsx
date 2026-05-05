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
import { nowIso } from '../lib/date'
import { useHandleVoice } from './use-handle-voice'
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

const getSpeechRecognitionCtor = (): (new () => SpeechRecognitionInstance) | null => {
  const ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!ctor) return null
  return ctor
}

const createRecognition = (Ctor: new () => SpeechRecognitionInstance): SpeechRecognitionInstance => {
  const recognition = new Ctor()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'
  return recognition
}

const buildTranscript = (args: {
  idx: number
  text: string
  finalized: boolean
  startedAt: string
}): VoiceTranscript => {
  const { idx, text, finalized, startedAt } = args
  return { id: `voice-${Date.now()}-${idx}`, text, finalized, startedAt }
}

const mergeTranscripts = (prev: VoiceTranscript[], next: VoiceTranscript[]): VoiceTranscript[] => {
  if (next.length === 0) return prev
  const updated = [...prev]
  for (const t of next) {
    const existingIdx = updated.findIndex(
      (e) => !e.finalized && e.id.startsWith(`voice-${t.startedAt.slice(0, 10)}`),
    )
    if (existingIdx !== -1 && !t.finalized) updated[existingIdx] = t
    else updated.push(t)
  }
  return updated
}

const handleFinalTranscript = async (args: {
  text: string
  isListeningRef: React.MutableRefObject<boolean>
  setState: React.Dispatch<React.SetStateAction<VoiceState>>
  handleVoice: (text: string) => Promise<void>
}): Promise<void> => {
  const { text, isListeningRef, setState, handleVoice } = args
  setState('processing')
  try {
    await handleVoice(text)
  } catch {
    // ignore sidecar failure; continue listening UI flow
  } finally {
    if (isListeningRef.current) setState('listening')
  }
}

const wireRecognitionHandlers = (args: {
  recognition: SpeechRecognitionInstance
  isListeningRef: React.MutableRefObject<boolean>
  setState: React.Dispatch<React.SetStateAction<VoiceState>>
  setErrorReason: React.Dispatch<React.SetStateAction<string>>
  setTranscripts: React.Dispatch<React.SetStateAction<VoiceTranscript[]>>
  clearSilenceTimer: () => void
  resetSilenceTimer: (onTimeout: () => void) => void
  stop: () => void
  setVoiceEnabled: (enabled: boolean) => void
  handleVoice: (text: string) => Promise<void>
}): void => {
  const {
    recognition,
    isListeningRef,
    setState,
    setErrorReason,
    setTranscripts,
    clearSilenceTimer,
    resetSilenceTimer,
    stop,
    setVoiceEnabled,
  } = args

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const startedAt = nowIso()
    const next: VoiceTranscript[] = []

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const item = result?.[0]
      if (!result || !item) continue
      next.push(buildTranscript({ idx: i, text: item.transcript, finalized: result.isFinal, startedAt }))
      if (result.isFinal) {
        void handleFinalTranscript({ text: item.transcript, isListeningRef, setState, handleVoice })
      }
    }

    if (next.length === 0) return
    setTranscripts((prev) => mergeTranscripts(prev, next))
    resetSilenceTimer(stop)
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
    if (!isListeningRef.current) return
    try {
      recognition.start()
    } catch {
      // Recognition may have already been stopped.
    }
  }
}

const startVoiceRecognition = (args: {
  isListeningRef: React.MutableRefObject<boolean>
  recognitionRef: React.MutableRefObject<SpeechRecognitionInstance | null>
  setState: React.Dispatch<React.SetStateAction<VoiceState>>
  setErrorReason: React.Dispatch<React.SetStateAction<string>>
  setTranscripts: React.Dispatch<React.SetStateAction<VoiceTranscript[]>>
  clearSilenceTimer: () => void
  resetSilenceTimer: (onTimeout: () => void) => void
  stop: () => void
  handleVoice: (text: string) => Promise<void>
}): void => {
  const {
    isListeningRef,
    recognitionRef,
    setState,
    setErrorReason,
    setTranscripts,
    clearSilenceTimer,
    resetSilenceTimer,
    stop,
  handleVoice,
  } = args

  if (isListeningRef.current) return

  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) {
    setState('error')
    setErrorReason('Speech recognition not supported')
    return
  }

  const recognition = createRecognition(Ctor)
  recognitionRef.current = recognition

  setTranscripts([])
  setState('listening')
  isListeningRef.current = true
  setVoiceEnabled(true)

  wireRecognitionHandlers({
    recognition,
    isListeningRef,
    setState,
    setErrorReason,
    setTranscripts,
    clearSilenceTimer,
    resetSilenceTimer,
    stop,
    setVoiceEnabled,
    handleVoice,
  })

  recognition.start()
  resetSilenceTimer(stop)
}

const stopVoiceRecognition = (args: {
  isListeningRef: React.MutableRefObject<boolean>
  recognitionRef: React.MutableRefObject<SpeechRecognitionInstance | null>
  clearSilenceTimer: () => void
  setState: React.Dispatch<React.SetStateAction<VoiceState>>
}): void => {
  const { isListeningRef, recognitionRef, clearSilenceTimer, setState } = args
  if (!isListeningRef.current) return
  isListeningRef.current = false
  clearSilenceTimer()
  recognitionRef.current?.stop()
  setState('idle')
  setVoiceEnabled(false)
}

function useVoiceController(): VoiceContextValue {
  const [state, setState] = useState<VoiceState>('idle')
  const [errorReason, setErrorReason] = useState('')
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([])

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isListeningRef = useRef(false)
  const handleVoice = useHandleVoice()

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
    stopVoiceRecognition({ isListeningRef, recognitionRef, clearSilenceTimer, setState })
  }, [clearSilenceTimer])

  // ---------------------------------------------------------------------------
  // start
  // ---------------------------------------------------------------------------

  const start = useCallback(() => {
    startVoiceRecognition({
      isListeningRef,
      recognitionRef,
      setState,
      setErrorReason,
      setTranscripts,
      clearSilenceTimer,
      resetSilenceTimer,
      stop,
      handleVoice,
    })
  }, [stop, clearSilenceTimer, resetSilenceTimer, handleVoice])

  // ---------------------------------------------------------------------------
  // toggle
  // ---------------------------------------------------------------------------

  const toggle = useCallback(() => (isListeningRef.current ? stop() : start()), [start, stop])

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

  return value
}

export function VoiceProvider({ children }: VoiceProviderProps) {
  const value = useVoiceController()
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}
