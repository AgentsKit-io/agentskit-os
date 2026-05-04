/**
 * ArtifactViewerProvider + useArtifactViewer — context for the immersive
 * artifact viewer (U-7).
 *
 * Usage:
 *   const { open, close, current } = useArtifactViewer()
 *   open(artifact)   // opens the fullscreen viewer for the given artifact
 *   close()          // closes the viewer
 *   current          // the currently open artifact, or null
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Artifact } from './artifact-types'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type ArtifactViewerContextValue = {
  /** The artifact currently open in the viewer, or null when closed. */
  current: Artifact | null
  /** Open the viewer for the given artifact. */
  open: (artifact: Artifact) => void
  /** Close the viewer. */
  close: () => void
}

const ArtifactViewerContext = createContext<ArtifactViewerContextValue | undefined>(undefined)

export function useArtifactViewer(): ArtifactViewerContextValue {
  const ctx = useContext(ArtifactViewerContext)
  if (!ctx) {
    throw new Error('useArtifactViewer must be used within an ArtifactViewerProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type ArtifactViewerProviderProps = {
  children: React.ReactNode
}

export function ArtifactViewerProvider({ children }: ArtifactViewerProviderProps): React.JSX.Element {
  const [current, setCurrent] = useState<Artifact | null>(null)

  const open = useCallback((artifact: Artifact) => setCurrent(artifact), [])
  const close = useCallback(() => setCurrent(null), [])

  // Global keyboard shortcut: Cmd+Shift+A (macOS) / Ctrl+Shift+A (Win/Linux)
  // When an artifact is open, the shortcut closes it.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'A' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCurrent((prev) => (prev !== null ? null : prev))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const value = useMemo<ArtifactViewerContextValue>(
    () => ({ current, open, close }),
    [current, open, close],
  )

  return (
    <ArtifactViewerContext.Provider value={value}>
      {children}
    </ArtifactViewerContext.Provider>
  )
}
