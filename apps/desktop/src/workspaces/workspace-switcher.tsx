/**
 * WorkspaceSwitcher — dropdown anchored to the sidebar header.
 *
 * Trigger button shows the current workspace name and its status dot.
 * Clicking opens a dropdown with a search field and list of all workspaces.
 * Also exposed as a ref-based open method for the Cmd/Ctrl+P shortcut.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useWorkspaces } from './workspaces-provider'
import { WorkspaceStatusBadge } from './workspace-status-badge'
import { useCommandPalette } from '../command-palette/command-palette-provider'
import type { Command } from '../command-palette/commands'
import { IconSvg } from '../components/icon-svg'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <IconSvg
      size={10}
      className={['transition-transform duration-150', open ? 'rotate-180' : ''].join(' ')}
    >
      <polyline points="6 9 12 15 18 9" />
    </IconSvg>
  )
}

type WorkspaceSwitcherTriggerProps = {
  readonly isOpen: boolean
  readonly dropdownId: string
  readonly currentName: string
  readonly currentStatus: string | undefined
  readonly onToggle: () => void
}

function WorkspaceSwitcherTrigger({
  isOpen,
  dropdownId,
  currentName,
  currentStatus,
  onToggle,
}: WorkspaceSwitcherTriggerProps) {
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-controls={dropdownId}
      aria-label={currentName === '' ? 'Select workspace' : `Current workspace: ${currentName}`}
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--ag-ink)] transition-colors hover:bg-[var(--ag-panel-alt)]"
      data-testid="workspace-switcher-trigger"
    >
      {currentStatus && <WorkspaceStatusBadge status={currentStatus} />}
      <span className="min-w-0 flex-1 truncate text-left font-medium">{currentName || 'Loading…'}</span>
      <ChevronIcon open={isOpen} />
    </button>
  )
}

type WorkspaceSwitcherDropdownProps = {
  readonly dropdownId: string
  readonly query: string
  readonly onQueryChange: (value: string) => void
  readonly searchRef: React.RefObject<HTMLInputElement | null>
  readonly currentId: string | undefined
  readonly items: ReadonlyArray<{ id: string; name: string; status: string }>
  readonly onSelect: (id: string) => void
}

function WorkspaceSwitcherDropdown({
  dropdownId,
  query,
  onQueryChange,
  searchRef,
  currentId,
  items,
  onSelect,
}: WorkspaceSwitcherDropdownProps) {
  return (
    <div
      id={dropdownId}
      role="listbox"
      aria-label="Workspaces"
      className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] shadow-lg"
      data-testid="workspace-switcher-dropdown"
    >
      <div className="border-b border-[var(--ag-line)] px-2 py-1.5">
        <input
          ref={searchRef}
          type="text"
          role="searchbox"
          aria-label="Search workspaces"
          placeholder="Search workspaces…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full bg-transparent text-sm text-[var(--ag-ink)] placeholder-[var(--ag-ink-subtle)] outline-none"
          data-testid="workspace-search-input"
        />
      </div>

      <ul className="max-h-60 overflow-y-auto py-1">
        {items.length === 0 ? (
          <li className="px-3 py-2 text-sm text-[var(--ag-ink-muted)]">No workspaces found</li>
        ) : (
          items.map((workspace) => (
            <li
              key={workspace.id}
              role="option"
              aria-selected={workspace.id === currentId}
              data-testid={`workspace-option-${workspace.id}`}
            >
              <button
                type="button"
                onClick={() => onSelect(workspace.id)}
                className={[
                  'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors',
                  workspace.id === currentId
                    ? 'bg-[var(--ag-accent)]/10 text-[var(--ag-accent)]'
                    : 'text-[var(--ag-ink)] hover:bg-[var(--ag-panel-alt)]',
                ].join(' ')}
              >
                <WorkspaceStatusBadge status={workspace.status} />
                <span className="flex-1 truncate text-left">{workspace.name}</span>
                {workspace.id === currentId && (
                  <span aria-hidden className="text-xs text-[var(--ag-accent)] opacity-70">
                    ✓
                  </span>
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

const useWorkspaceSwitcherCommand = (args: {
  registerCommand: (c: Command) => void
  openDropdown: () => void
}): void => {
  const { registerCommand, openDropdown } = args
  useEffect(() => {
    registerCommand({
      id: 'workspaces.switch',
      label: 'Switch workspace',
      keywords: ['workspace', 'project', 'switch', 'change'],
      category: 'Navigation',
      run: openDropdown,
    })
  }, [registerCommand, openDropdown])
}

const useWorkspaceSwitcherHotkey = (openDropdown: () => void): void => {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const modKey = e.metaKey || e.ctrlKey
      if (modKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        openDropdown()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openDropdown])
}

const useFocusSearchOnOpen = (args: { isOpen: boolean; searchRef: React.RefObject<HTMLInputElement | null> }): void => {
  const { isOpen, searchRef } = args
  useEffect(() => {
    if (!isOpen) return
    requestAnimationFrame(() => {
      searchRef.current?.focus()
    })
  }, [isOpen, searchRef])
}

const useCloseOnOutsidePointerDown = (args: {
  isOpen: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  closeDropdown: () => void
}): void => {
  const { isOpen, containerRef, closeDropdown } = args
  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, closeDropdown, containerRef])
}

const useCloseOnEscape = (args: { isOpen: boolean; closeDropdown: () => void }): void => {
  const { isOpen, closeDropdown } = args
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDropdown()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeDropdown])
}

export function WorkspaceSwitcher() {
  const { all, current, switch: switchWorkspace } = useWorkspaces()
  const { registerCommand } = useCommandPalette()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const dropdownId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const openDropdown = useCallback(() => {
    setIsOpen(true)
    setQuery('')
  }, [])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  const toggleDropdown = useCallback(() => {
    if (isOpen) {
      closeDropdown()
    } else {
      openDropdown()
    }
  }, [isOpen, openDropdown, closeDropdown])

  useWorkspaceSwitcherCommand({ registerCommand, openDropdown })

  useWorkspaceSwitcherHotkey(openDropdown)

  useFocusSearchOnOpen({ isOpen, searchRef })

  useCloseOnOutsidePointerDown({ isOpen, containerRef, closeDropdown })

  useCloseOnEscape({ isOpen, closeDropdown })

  const filteredWorkspaces = query.trim()
    ? all.filter((w) =>
        w.name.toLowerCase().includes(query.toLowerCase()),
      )
    : all

  const handleSelect = useCallback(
    (id: string) => {
      switchWorkspace(id)
      closeDropdown()
    },
    [switchWorkspace, closeDropdown],
  )

  return (
    <div ref={containerRef} className="relative px-3 pt-2 pb-1">
      <WorkspaceSwitcherTrigger
        isOpen={isOpen}
        dropdownId={dropdownId}
        currentName={current?.name ?? ''}
        currentStatus={current?.status}
        onToggle={toggleDropdown}
      />

      {isOpen && (
        <WorkspaceSwitcherDropdown
          dropdownId={dropdownId}
          query={query}
          onQueryChange={setQuery}
          searchRef={searchRef}
          currentId={current?.id}
          items={filteredWorkspaces}
          onSelect={handleSelect}
        />
      )}
    </div>
  )
}
