/**
 * DashboardTabs — top strip with one tab per dashboard.
 *
 * "+" button creates a new dashboard (prompts for a name via window.prompt).
 * Right-click (contextmenu) on a tab shows a menu to rename or delete it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDashboards } from './dashboards-provider'

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

type ContextMenuState = {
  dashboardId: string
  name: string
  x: number
  y: number
}

type ContextMenuProps = {
  state: ContextMenuState
  onClose: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

function TabContextMenu({ state, onClose, onRename, onDelete }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click-outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const handleRename = () => {
    const newName = window.prompt('Rename dashboard', state.name)
    onClose()
    if (newName && newName.trim()) {
      onRename(state.dashboardId, newName.trim())
    }
  }

  const handleDelete = () => {
    onClose()
    onDelete(state.dashboardId)
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Dashboard options"
      data-testid="tab-context-menu"
      style={{ left: state.x, top: state.y }}
      className="fixed z-50 min-w-[140px] rounded-md border border-[var(--ag-line)] bg-[var(--ag-panel)] py-1 shadow-lg"
    >
      <button
        role="menuitem"
        type="button"
        onClick={handleRename}
        className="flex w-full items-center px-3 py-1.5 text-sm text-[var(--ag-ink)] hover:bg-[var(--ag-panel-alt)]"
      >
        Rename…
      </button>
      <button
        role="menuitem"
        type="button"
        onClick={handleDelete}
        className="flex w-full items-center px-3 py-1.5 text-sm text-[var(--ag-ink)] hover:bg-[var(--ag-panel-alt)]"
      >
        Delete
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DashboardTabs
// ---------------------------------------------------------------------------

export function DashboardTabs() {
  const { all, active, switch: switchDashboard, create, rename, delete: deleteDashboard } =
    useDashboards()

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const handleCreate = useCallback(() => {
    const name = window.prompt('New dashboard name', 'My Dashboard')
    if (name && name.trim()) {
      create(name.trim())
    }
  }, [create])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string, name: string) => {
      e.preventDefault()
      setContextMenu({ dashboardId: id, name, x: e.clientX, y: e.clientY })
    },
    [],
  )

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  return (
    <>
      <div
        role="tablist"
        aria-label="Dashboards"
        data-testid="dashboard-tabs"
        className="flex items-center gap-1 border-b border-[var(--ag-line)] px-4 py-1 overflow-x-auto"
      >
        {all.map((dashboard) => (
          <button
            key={dashboard.id}
            role="tab"
            type="button"
            data-testid={`dashboard-tab-${dashboard.id}`}
            aria-selected={dashboard.id === active.id}
            onClick={() => switchDashboard(dashboard.id)}
            onContextMenu={(e) => handleContextMenu(e, dashboard.id, dashboard.name)}
            className={[
              'flex shrink-0 items-center rounded-t-md px-3 py-1.5 text-sm transition-colors',
              dashboard.id === active.id
                ? 'border border-b-0 border-[var(--ag-line)] bg-[var(--ag-surface)] font-medium text-[var(--ag-ink)]'
                : 'text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]',
            ].join(' ')}
          >
            {dashboard.name}
          </button>
        ))}

        <button
          type="button"
          data-testid="create-dashboard-btn"
          aria-label="Create new dashboard"
          onClick={handleCreate}
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--ag-ink-muted)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          +
        </button>
      </div>

      {contextMenu && (
        <TabContextMenu
          state={contextMenu}
          onClose={closeContextMenu}
          onRename={rename}
          onDelete={deleteDashboard}
        />
      )}
    </>
  )
}
