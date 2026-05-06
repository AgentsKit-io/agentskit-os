/**
 * useWorkspacesStore — persist currentWorkspaceId to localStorage.
 *
 * Storage key: `agentskitos.current-workspace`
 */

const STORAGE_KEY = 'agentskitos.current-workspace'

export function getCurrentWorkspaceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setCurrentWorkspaceId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Ignore storage errors
  }
}

export function clearCurrentWorkspaceId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}
