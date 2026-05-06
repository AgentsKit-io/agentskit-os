/**
 * AssistantProvider — global context for the inline LLM prompt assistant
 * (M2, issue #179).
 *
 * Listens for Cmd+I (macOS) / Ctrl+I (Windows/Linux) when a focused element
 * carries a `data-assist-target` attribute.  The provider then opens the
 * overlay anchored to that element.
 *
 * Exposed via `useAssistant()`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { AssistantTarget, AssistantSuggestion } from './assistant-types'

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export type AssistantContextValue = {
  /** Whether the assistant overlay is currently visible. */
  isOpen: boolean
  /** The element the overlay is currently anchored to (null if closed). */
  currentTarget: AssistantTarget | null
  /** The active (streaming or complete) suggestion, if any. */
  currentSuggestion: AssistantSuggestion | null
  /** Open the overlay for a specific target. */
  openFor: (target: AssistantTarget) => void
  /** Close the overlay and discard any in-progress suggestion. */
  close: () => void
  /** Update the in-progress suggestion (called by useAssistStream). */
  setSuggestion: (suggestion: AssistantSuggestion | null) => void
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined)

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext)
  if (!ctx) {
    throw new Error('useAssistant must be used within an AssistantProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type AssistantProviderProps = {
  children: React.ReactNode
}

export function AssistantProvider({ children }: AssistantProviderProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTarget, setCurrentTarget] = useState<AssistantTarget | null>(null)
  const [currentSuggestion, setCurrentSuggestion] = useState<AssistantSuggestion | null>(null)

  const openFor = useCallback((target: AssistantTarget) => {
    setCurrentTarget(target)
    setCurrentSuggestion(null)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setCurrentTarget(null)
    setCurrentSuggestion(null)
  }, [])

  const setSuggestion = useCallback((suggestion: AssistantSuggestion | null) => {
    setCurrentSuggestion(suggestion)
  }, [])

  // Global Cmd+I / Ctrl+I: open overlay when focused element has data-assist-target
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
        const active = document.activeElement as HTMLElement | null
        if (!active) return
        const targetId = active.getAttribute('data-assist-target')
        if (!targetId) return
        e.preventDefault()
        const kind = (active.getAttribute('data-assist-kind') ?? 'config-field') as AssistantTarget['kind']
        openFor({ id: targetId, kind })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openFor])

  const value = useMemo<AssistantContextValue>(
    () => ({ isOpen, currentTarget, currentSuggestion, openFor, close, setSuggestion }),
    [isOpen, currentTarget, currentSuggestion, openFor, close, setSuggestion],
  )

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  )
}
