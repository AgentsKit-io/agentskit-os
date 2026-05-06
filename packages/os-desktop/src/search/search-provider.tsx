/**
 * SearchProvider — global search context (D-11).
 *
 * Exposes `useSearch()` returning `{ open, close, isOpen }`.
 * Listens for Cmd+/ / Ctrl+/ globally and opens the overlay.
 *
 * Must be rendered inside `CommandPaletteProvider` (to read palette commands)
 * and `WorkspacesProvider` (to read workspaces).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type SearchContextValue = {
  /** Whether the search overlay is currently open. */
  isOpen: boolean
  /** Open the search overlay. */
  open: () => void
  /** Close the search overlay. */
  close: () => void
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined)

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type SearchProviderProps = {
  children: React.ReactNode
}

export function SearchProvider({ children }: SearchProviderProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  // Global keyboard shortcut: Cmd+/ (macOS) / Ctrl+/ (Windows / Linux)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const value = useMemo<SearchContextValue>(
    () => ({ isOpen, open, close }),
    [isOpen, open, close],
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}
