/**
 * VoiceToggle — mic button for the sidebar header.
 *
 * Rendered next to NotificationBell and FocusToggle.
 * Toggles voice recognition via useVoice().
 */

import { Mic, MicOff } from 'lucide-react'
import { useVoice } from './voice-provider'

export function VoiceToggle() {
  const { state, toggle } = useVoice()

  const isActive = state === 'listening' || state === 'processing'
  const isError = state === 'error'

  return (
    <button
      type="button"
      data-testid="voice-toggle"
      aria-label={isActive ? 'Stop voice mode' : 'Start voice mode'}
      aria-pressed={isActive}
      onClick={toggle}
      className={[
        'rounded p-0.5 transition-colors',
        isError
          ? 'text-[var(--ag-danger)] hover:text-[var(--ag-danger)]'
          : isActive
            ? 'text-[var(--ag-accent)] hover:text-[var(--ag-accent)]'
            : 'text-[var(--ag-ink-subtle)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]',
      ].join(' ')}
    >
      {isActive ? (
        <Mic className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <MicOff className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  )
}
