/**
 * VoiceOverlay — fixed bottom-center capsule showing the live transcript.
 *
 * Visible only while state is 'listening' or 'processing'.
 * Clicking the overlay stops recognition.
 */

import { useVoice } from './voice-provider'

export function VoiceOverlay() {
  const { state, transcripts, stop } = useVoice()

  const isVisible = state === 'listening' || state === 'processing'
  if (!isVisible) return null

  const latestTranscript = transcripts[transcripts.length - 1]
  const displayText =
    latestTranscript?.text.trim() ||
    (state === 'listening' ? 'Listening…' : 'Processing…')

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Voice transcript"
      data-testid="voice-overlay"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
    >
      <button
        type="button"
        aria-label="Stop voice mode"
        onClick={stop}
        className={[
          'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg',
          'bg-[var(--ag-panel)] text-[var(--ag-ink)] ring-1 ring-[var(--ag-line)]',
          'transition-all hover:bg-[var(--ag-panel-alt)]',
        ].join(' ')}
      >
        {/* Animated mic indicator */}
        <span
          aria-hidden
          className={[
            'h-2 w-2 shrink-0 rounded-full',
            state === 'listening'
              ? 'animate-pulse bg-red-500'
              : 'bg-[var(--ag-accent)]',
          ].join(' ')}
        />
        <span className="max-w-xs truncate">{displayText}</span>
        <span aria-hidden className="text-[var(--ag-ink-muted)] text-xs">
          click to stop
        </span>
      </button>
    </div>
  )
}
