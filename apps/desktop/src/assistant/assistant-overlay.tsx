/**
 * AssistantOverlay — small popover anchored near the `data-assist-target`
 * element currently active in AssistantContext.
 *
 * Behaviour:
 *   - Input field + Send button: submit a prompt
 *   - Response area: shows live streaming output
 *   - Accept button: user signals acceptance (non-blocking, logs to console for now)
 *   - Dismiss / Esc: close overlay without applying
 *
 * Positioning uses `getBoundingClientRect` on the target DOM element (looked up
 * by `data-assist-target="<id>"`).  Falls back to a centered position when the
 * element is not found (e.g. in tests or when the node has scrolled away).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { GlassPanel, Kbd } from '@agentskit/os-ui'
import { useAssistant } from './assistant-provider'
import { useAssistStream } from './use-assist-stream'

// ---------------------------------------------------------------------------
// Position helpers
// ---------------------------------------------------------------------------

type Coords = { top: number; left: number }

function getTargetCoords(targetId: string): Coords {
  const el = document.querySelector(`[data-assist-target="${CSS.escape(targetId)}"]`)
  if (!el) {
    // Fallback: centre of viewport
    return {
      top: window.innerHeight * 0.3,
      left: window.innerWidth * 0.5 - 200,
    }
  }
  const rect = el.getBoundingClientRect()
  return {
    top: rect.bottom + 8,
    left: Math.min(rect.left, window.innerWidth - 420),
  }
}

const useOverlayPosition = (args: {
  isOpen: boolean
  currentTarget: { id: string } | null
  setPrompt: React.Dispatch<React.SetStateAction<string>>
  inputRef: React.RefObject<HTMLInputElement | null>
}): Coords => {
  const { isOpen, currentTarget, setPrompt, inputRef } = args
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 })
  useEffect(() => {
    if (!isOpen || !currentTarget) return
    setCoords(getTargetCoords(currentTarget.id))
    setPrompt('')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [isOpen, currentTarget, setPrompt, inputRef])
  return coords
}

const useEscapeToDismiss = (args: {
  handleDismiss: () => void
}): ((e: React.KeyboardEvent<HTMLDivElement>) => void) => {
  const { handleDismiss } = args
  return useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      handleDismiss()
    },
    [handleDismiss],
  )
}

const useEnterToSend = (args: {
  handleSend: () => void
}): ((e: React.KeyboardEvent<HTMLInputElement>) => void) => {
  const { handleSend } = args
  return useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || e.shiftKey) return
      e.preventDefault()
      handleSend()
    },
    [handleSend],
  )
}

// ---------------------------------------------------------------------------
// AssistantOverlay
// ---------------------------------------------------------------------------

type AssistantOverlayViewProps = {
  readonly coords: Coords
  readonly currentTarget: { readonly id: string; readonly kind: string }
  readonly currentSuggestion: { readonly status: string; readonly response: string } | null
  readonly prompt: string
  readonly inputRef: React.RefObject<HTMLInputElement | null>
  readonly isStreaming: boolean
  readonly hasResponse: boolean
  readonly isComplete: boolean
  readonly isError: boolean
  readonly onPromptChange: (value: string) => void
  readonly onSend: () => void
  readonly onAccept: () => void
  readonly onDismiss: () => void
  readonly onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  readonly onPromptKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

function AssistantOverlayView({
  coords,
  currentTarget,
  currentSuggestion,
  prompt,
  inputRef,
  isStreaming,
  hasResponse,
  isComplete,
  isError,
  onPromptChange,
  onSend,
  onAccept,
  onDismiss,
  onKeyDown,
  onPromptKeyDown,
}: AssistantOverlayViewProps): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Inline LLM assistant"
      data-testid="assistant-overlay"
      className="fixed z-50"
      style={{ top: coords.top, left: coords.left }}
      onKeyDown={onKeyDown}
    >
      <GlassPanel
        blur="lg"
        className="w-[400px] flex flex-col gap-0 overflow-hidden shadow-2xl"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--ag-line)] shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]">
              Assistant
            </span>
            <span className="text-[10px] text-[var(--ag-ink-subtle)] font-mono truncate">
              {currentTarget.kind}:{currentTarget.id}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Kbd>Esc</Kbd>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={onDismiss}
              className="ml-1 text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)] transition-colors text-sm leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--ag-line)] shrink-0">
          <input
            ref={inputRef}
            type="text"
            aria-label="Assistant prompt"
            placeholder="Describe what you need…"
            value={prompt}
            disabled={isStreaming}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={onPromptKeyDown}
            className="flex-1 bg-transparent text-sm text-[var(--ag-ink)] placeholder:text-[var(--ag-ink-muted)] outline-none disabled:opacity-50"
          />
          <button
            type="button"
            aria-label="Send prompt"
            disabled={!prompt.trim() || isStreaming}
            onClick={onSend}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium bg-[var(--ag-accent)]/20 text-[var(--ag-accent)] hover:bg-[var(--ag-accent)]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? 'Streaming…' : 'Send'}
          </button>
        </div>

        {hasResponse && currentSuggestion !== null && (
          <div
            aria-live="polite"
            aria-label="Assistant response"
            className="px-3 py-2 text-sm text-[var(--ag-ink)] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed"
          >
            {currentSuggestion.response}
            {isStreaming && (
              <span
                aria-hidden
                className="inline-block w-[6px] h-[13px] ml-0.5 align-middle bg-[var(--ag-accent)] animate-pulse rounded-sm"
              />
            )}
          </div>
        )}

        {isError && currentSuggestion !== null && (
          <p role="alert" className="px-3 py-2 text-xs text-[var(--ag-danger)]">
            {currentSuggestion.response}
          </p>
        )}

        {isComplete && (
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[var(--ag-line)] shrink-0">
            <button
              type="button"
              aria-label="Dismiss suggestion"
              onClick={onDismiss}
              className="text-xs text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)] transition-colors"
            >
              Dismiss
            </button>
            <button
              type="button"
              aria-label="Accept suggestion"
              onClick={onAccept}
              className="rounded px-2 py-1 text-xs font-medium bg-[var(--ag-accent)]/20 text-[var(--ag-accent)] hover:bg-[var(--ag-accent)]/30 transition-colors"
            >
              Accept
            </button>
          </div>
        )}
      </GlassPanel>
    </div>
  )
}

export function AssistantOverlay(): React.JSX.Element | null {
  const { isOpen, currentTarget, currentSuggestion, close } = useAssistant()
  const { stream, cancel } = useAssistStream()

  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const coords = useOverlayPosition({
    isOpen,
    currentTarget: currentTarget ?? null,
    setPrompt,
    inputRef,
  })

  const handleSend = useCallback(() => {
    const trimmed = prompt.trim()
    if (!trimmed || !currentTarget) return
    stream({ target: currentTarget, prompt: trimmed })
  }, [prompt, currentTarget, stream])

  const handleAccept = useCallback(() => {
    // TODO: wire to actual apply logic when a flow editor surface exists
    // For now, emit a console statement so the accept action is observable.
    // eslint-disable-next-line no-console
    console.info('[assistant] suggestion accepted', currentSuggestion)
    close()
  }, [currentSuggestion, close])

  const handleDismiss = useCallback(() => {
    cancel()
    close()
  }, [cancel, close])

  const handleKeyDown = useEscapeToDismiss({ handleDismiss })

  const handleFormKeyDown = useEnterToSend({ handleSend })

  if (!isOpen || !currentTarget) return null

  const isStreaming = currentSuggestion?.status === 'streaming'
  const hasResponse = currentSuggestion !== null && currentSuggestion.response.length > 0
  const isComplete = currentSuggestion?.status === 'complete'
  const isError = currentSuggestion?.status === 'error'

  return (
    <AssistantOverlayView
      coords={coords}
      currentTarget={currentTarget}
      currentSuggestion={currentSuggestion}
      prompt={prompt}
      inputRef={inputRef}
      isStreaming={!!isStreaming}
      hasResponse={hasResponse}
      isComplete={!!isComplete}
      isError={!!isError}
      onPromptChange={setPrompt}
      onSend={handleSend}
      onAccept={handleAccept}
      onDismiss={handleDismiss}
      onKeyDown={handleKeyDown}
      onPromptKeyDown={handleFormKeyDown}
    />
  )
}
