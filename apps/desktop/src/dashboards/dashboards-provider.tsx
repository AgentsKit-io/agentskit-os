/**
 * DashboardsProvider — global multi-dashboard context.
 *
 * Exposes `useDashboards()` returning:
 *   { all, active, switch, create, rename, delete: removeDashboard,
 *     addWidget, removeWidget, updateLayout, reset, exportJson, importJson }
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { useDashboardsStore, makeWidgetId } from './use-dashboards-store'
import { getWidgetEntry, isCustomWidgetKind } from './widget-registry'
import type { Dashboard, Widget, WidgetId } from './types'
import type { DashboardTemplate } from './marketplace/marketplace-types'

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export type DashboardsContextValue = {
  /** All dashboards in the set. */
  all: Dashboard[]
  /** Currently-active dashboard (always defined). */
  active: Dashboard
  /** Switch the active dashboard by id. */
  switch: (id: string) => void
  /** Create a new dashboard with the given name; activates it. Returns new id. */
  create: (name: string) => string
  /** Rename a dashboard. */
  rename: (id: string, name: string) => void
  /** Delete a dashboard (noop if would leave zero). */
  delete: (id: string) => void
  /** Add a widget of a given kind to the active dashboard (or specified id). */
  addWidget: (kind: string, dashboardId?: string) => void
  /** Remove a widget from a dashboard. */
  removeWidget: (dashboardId: string, widgetId: WidgetId) => void
  /** Update the full widget layout for a dashboard. */
  updateLayout: (dashboardId: string, widgets: Widget[]) => void
  /** Reset to defaults. */
  reset: () => void
  /** Export state as JSON string. */
  exportJson: () => string
  /** Import from JSON string; returns success bool. */
  importJson: (json: string) => boolean
  /** Create a new dashboard from a marketplace template. Returns new dashboard id. */
  createFromTemplate: (template: DashboardTemplate) => string
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DashboardsContext = createContext<DashboardsContextValue | undefined>(undefined)

export function useDashboards(): DashboardsContextValue {
  const ctx = useContext(DashboardsContext)
  if (!ctx) {
    throw new Error('useDashboards must be used within a DashboardsProvider')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type DashboardsProviderProps = {
  children: React.ReactNode
}

export function DashboardsProvider({ children }: DashboardsProviderProps) {
  const store = useDashboardsStore()

  const active: Dashboard = useMemo(() => {
    return (
      store.set.dashboards.find((d) => d.id === store.set.activeId) ??
      // Fallback: should never happen with well-formed data
      (store.set.dashboards[0] as Dashboard)
    )
  }, [store.set])

  const addWidget = useCallback(
    (kind: string, dashboardId?: string) => {
      const targetId = dashboardId ?? store.set.activeId
      const entry = getWidgetEntry(kind)
      // Allow custom widget kinds even though they're not in BUILT_IN_WIDGETS
      const isCustom = isCustomWidgetKind(kind)
      if (!entry && !isCustom) return

      const [w, h] = entry?.defaultSize ?? [4, 2]
      // Place the new widget below all existing widgets on the target dashboard
      const target = store.set.dashboards.find((d) => d.id === targetId)
      const maxY = target
        ? target.widgets.reduce((acc, wgt) => Math.max(acc, wgt.y + wgt.h), 0)
        : 0

      const widget: Widget = {
        id: makeWidgetId(),
        kind,
        x: 0,
        y: maxY,
        w,
        h,
      }
      store.addWidget(targetId, widget)
    },
    [store],
  )

  const createFromTemplate = useCallback(
    (template: DashboardTemplate): string => {
      // Create a new blank dashboard with the template's name, then populate
      // its widgets from the template layout.
      const id = store.createDashboard(template.layout.name)
      store.updateLayout(id, template.layout.widgets)
      return id
    },
    [store],
  )

  const value: DashboardsContextValue = useMemo(
    () => ({
      all: store.set.dashboards,
      active,
      switch: store.switchDashboard,
      create: store.createDashboard,
      rename: store.renameDashboard,
      delete: store.removeDashboard,
      addWidget,
      removeWidget: store.removeWidget,
      updateLayout: store.updateLayout,
      reset: store.reset,
      exportJson: store.exportJson,
      importJson: store.importJson,
      createFromTemplate,
    }),
    [store, active, addWidget, createFromTemplate],
  )

  return (
    <DashboardsContext.Provider value={value}>
      {children}
    </DashboardsContext.Provider>
  )
}
