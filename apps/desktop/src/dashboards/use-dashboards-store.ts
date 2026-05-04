/**
 * useDashboardsStore — localStorage-backed multi-dashboard state.
 *
 * Persists to `agentskitos.dashboards`.
 * Validates via Zod on hydration; falls back to default set on parse failure.
 * Exposes CRUD helpers + JSON export/import.
 */

import { useCallback, useState } from 'react'
import { DashboardSetSchema, type Dashboard, type DashboardSet, type Widget, type WidgetId } from './types'

const STORAGE_KEY = 'agentskitos.dashboards'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function buildDefaultSet(): DashboardSet {
  const defaultId = 'agentskitos.default'
  return {
    dashboards: [
      {
        id: defaultId,
        name: 'Overview',
        gridCols: 12,
        gridRowHeight: 80,
        widgets: [
          {
            id: 'widget-stats' as WidgetId,
            kind: 'stats-summary',
            x: 0,
            y: 0,
            w: 12,
            h: 2,
          },
          {
            id: 'widget-recent-runs' as WidgetId,
            kind: 'recent-runs',
            x: 0,
            y: 2,
            w: 12,
            h: 3,
          },
          {
            id: 'widget-events' as WidgetId,
            kind: 'event-feed',
            x: 0,
            y: 5,
            w: 12,
            h: 3,
          },
        ],
      },
    ],
    activeId: defaultId,
  }
}

function loadFromStorage(): DashboardSet {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildDefaultSet()
    const parsed: unknown = JSON.parse(raw)
    const result = DashboardSetSchema.safeParse(parsed)
    return result.success ? result.data : buildDefaultSet()
  } catch {
    return buildDefaultSet()
  }
}

function saveToStorage(set: DashboardSet): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(set))
  } catch {
    // Ignore QuotaExceededError
  }
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export type DashboardsStore = {
  set: DashboardSet
  /** Switch the active dashboard. */
  switchDashboard: (id: string) => void
  /** Create a new dashboard with the given name; returns new id. */
  createDashboard: (name: string) => string
  /** Rename an existing dashboard. */
  renameDashboard: (id: string, name: string) => void
  /** Delete a dashboard by id (noop if it would leave zero dashboards). */
  removeDashboard: (id: string) => void
  /** Add a widget to a dashboard. */
  addWidget: (dashboardId: string, widget: Widget) => void
  /** Remove a widget from a dashboard. */
  removeWidget: (dashboardId: string, widgetId: WidgetId) => void
  /** Replace the widget layout (positions/sizes) for a dashboard. */
  updateLayout: (dashboardId: string, widgets: Widget[]) => void
  /** Reset to the default set (for tests / dev). */
  reset: () => void
  /** Export the full set as a JSON string. */
  exportJson: () => string
  /** Import a JSON string; returns true on success, false on parse error. */
  importJson: (json: string) => boolean
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDashboardsStore(): DashboardsStore {
  const [set, setSet] = useState<DashboardSet>(() => loadFromStorage())

  const mutate = useCallback((updater: (prev: DashboardSet) => DashboardSet) => {
    setSet((prev) => {
      const next = updater(prev)
      saveToStorage(next)
      return next
    })
  }, [])

  const switchDashboard = useCallback(
    (id: string) => {
      mutate((prev) => {
        if (!prev.dashboards.find((d) => d.id === id)) return prev
        return { ...prev, activeId: id }
      })
    },
    [mutate],
  )

  const createDashboard = useCallback(
    (name: string): string => {
      const id = generateId()
      mutate((prev) => ({
        dashboards: [
          ...prev.dashboards,
          {
            id,
            name,
            widgets: [],
            gridCols: 12,
            gridRowHeight: 80,
          },
        ],
        activeId: id,
      }))
      return id
    },
    [mutate],
  )

  const renameDashboard = useCallback(
    (id: string, name: string) => {
      mutate((prev) => ({
        ...prev,
        dashboards: prev.dashboards.map((d) => (d.id === id ? { ...d, name } : d)),
      }))
    },
    [mutate],
  )

  const removeDashboard = useCallback(
    (id: string) => {
      mutate((prev) => {
        if (prev.dashboards.length <= 1) return prev
        const dashboards = prev.dashboards.filter((d) => d.id !== id)
        const activeId =
          prev.activeId === id ? (dashboards[0]?.id ?? prev.activeId) : prev.activeId
        return { dashboards, activeId }
      })
    },
    [mutate],
  )

  const addWidget = useCallback(
    (dashboardId: string, widget: Widget) => {
      mutate((prev) => ({
        ...prev,
        dashboards: prev.dashboards.map((d) =>
          d.id === dashboardId ? { ...d, widgets: [...d.widgets, widget] } : d,
        ),
      }))
    },
    [mutate],
  )

  const removeWidget = useCallback(
    (dashboardId: string, widgetId: WidgetId) => {
      mutate((prev) => ({
        ...prev,
        dashboards: prev.dashboards.map((d) =>
          d.id === dashboardId
            ? { ...d, widgets: d.widgets.filter((w) => w.id !== widgetId) }
            : d,
        ),
      }))
    },
    [mutate],
  )

  const updateLayout = useCallback(
    (dashboardId: string, widgets: Widget[]) => {
      mutate((prev) => ({
        ...prev,
        dashboards: prev.dashboards.map((d) =>
          d.id === dashboardId ? { ...d, widgets } : d,
        ),
      }))
    },
    [mutate],
  )

  const reset = useCallback(() => {
    const defaultSet = buildDefaultSet()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
    setSet(defaultSet)
  }, [])

  const exportJson = useCallback((): string => {
    return JSON.stringify(set, null, 2)
  }, [set])

  const importJson = useCallback(
    (json: string): boolean => {
      try {
        const parsed: unknown = JSON.parse(json)
        const result = DashboardSetSchema.safeParse(parsed)
        if (!result.success) return false
        mutate(() => result.data)
        return true
      } catch {
        return false
      }
    },
    [mutate],
  )

  return {
    set,
    switchDashboard,
    createDashboard,
    renameDashboard,
    removeDashboard,
    addWidget,
    removeWidget,
    updateLayout,
    reset,
    exportJson,
    importJson,
  }
}

/** Re-export the default set builder for tests. */
export { buildDefaultSet }

/** Helper to make a widget id (for convenience). */
export function makeWidgetId(): WidgetId {
  return generateId() as WidgetId
}

/** Look up a dashboard from the set. */
export function getDashboard(set: DashboardSet, id: string): Dashboard | undefined {
  return set.dashboards.find((d) => d.id === id)
}
