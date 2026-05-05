/**
 * WorkspacesProvider — global workspaces context.
 *
 * Exposes `useWorkspaces()` returning `{ all, current, switch, status }`.
 * Reads workspaces via `sidecarRequest('workspaces.list')`.
 * Falls back to mock data when the sidecar is unavailable.
 * Persists the current workspace selection via localStorage.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { sidecarRequest } from '../lib/sidecar'
import {
  getCurrentWorkspaceId,
  setCurrentWorkspaceId,
} from './use-workspaces-store'
import type { Workspace, WorkspaceStatus } from './types'

// ---------------------------------------------------------------------------
// Fixture data fallback
// ---------------------------------------------------------------------------

const WORKSPACES_FIXTURE: Workspace[] = [
  { id: 'ws-1', name: 'Default', status: 'idle' },
  { id: 'ws-2', name: 'Production', status: 'running' },
  { id: 'ws-3', name: 'Staging', status: 'paused' },
]

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type WorkspacesContextValue = {
  /** All available workspaces. */
  all: Workspace[]
  /** The currently-selected workspace, or null if none loaded yet. */
  current: Workspace | null
  /** Switch the active workspace by id. */
  switch: (id: string) => void
  /** Loading / error status of the workspace list. */
  status: 'loading' | 'ready' | 'error'
}

const WorkspacesContext = createContext<WorkspacesContextValue | undefined>(undefined)

export function useWorkspaces(): WorkspacesContextValue {
  const ctx = useContext(WorkspacesContext)
  if (!ctx) {
    throw new Error('useWorkspaces must be used within a WorkspacesProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type WorkspacesProviderProps = {
  children: React.ReactNode
  /** Override workspace list (useful in tests). */
  initialWorkspaces?: Workspace[]
}

type SidecarWorkspace = {
  id: string
  name: string
  status: WorkspaceStatus
  description?: string
}

export function WorkspacesProvider({
  children,
  initialWorkspaces,
}: WorkspacesProviderProps) {
  const [all, setAll] = useState<Workspace[]>(initialWorkspaces ?? [])
  const [currentId, setCurrentId] = useState<string | null>(() => getCurrentWorkspaceId())
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // Fetch workspace list from sidecar on mount
  useEffect(() => {
    if (initialWorkspaces) {
      setAll(initialWorkspaces)
      setLoadStatus('ready')
      return
    }

    sidecarRequest<SidecarWorkspace[]>('workspaces.list')
      .then((result) => {
        // If result is empty (sidecar unavailable stub returns {}), use mock
        const workspaces =
          Array.isArray(result) && result.length > 0 ? result : WORKSPACES_FIXTURE
        setAll(workspaces)
        setLoadStatus('ready')
      })
      .catch(() => {
        // Sidecar unavailable — use mock data
        setAll(WORKSPACES_FIXTURE)
        setLoadStatus('ready')
      })
  }, [initialWorkspaces])

  // When all changes, ensure currentId points to a valid workspace
  useEffect(() => {
    if (all.length === 0) return
    const valid = all.find((w) => w.id === currentId)
    if (!valid) {
      const first = all[0]
      if (first) {
        setCurrentId(first.id)
        setCurrentWorkspaceId(first.id)
      }
    }
  }, [all, currentId])

  const switchWorkspace = useCallback(
    (id: string) => {
      const workspace = all.find((w) => w.id === id)
      if (!workspace) return
      setCurrentId(id)
      setCurrentWorkspaceId(id)
    },
    [all],
  )

  const current = useMemo(
    () => all.find((w) => w.id === currentId) ?? null,
    [all, currentId],
  )

  const value: WorkspacesContextValue = useMemo(
    () => ({
      all,
      current,
      switch: switchWorkspace,
      status: loadStatus,
    }),
    [all, current, switchWorkspace, loadStatus],
  )

  return (
    <WorkspacesContext.Provider value={value}>{children}</WorkspacesContext.Provider>
  )
}
