/**
 * DashboardGrid — renders a grid of widgets with drag-to-move and
 * resize-via-corner handle. Pure pointer-event implementation (no external lib).
 *
 * Layout is pure CSS Grid. Each widget is positioned via `grid-column` and
 * `grid-row` shorthand. On drag/resize end the updated layout is committed to
 * the store.
 */

import { useCallback, useRef, useState } from 'react'
import type { Dashboard, Widget, WidgetId } from './types'
import { renderWidget } from './widget-renderers'
import type { WidgetRenderContext } from './widget-registry'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DragState = {
  widgetId: WidgetId
  mode: 'move' | 'resize'
  /** Pointer position when drag started */
  startX: number
  startY: number
  /** Widget geometry when drag started */
  origX: number
  origY: number
  origW: number
  origH: number
}

type Props = {
  dashboard: Dashboard
  ctx: WidgetRenderContext
  onLayoutChange: (widgets: Widget[]) => void
  onRemoveWidget?: (widgetId: WidgetId) => void
}

// ---------------------------------------------------------------------------
// Grid tile
// ---------------------------------------------------------------------------

type TileProps = {
  widget: Widget
  gridCols: number
  rowHeight: number
  children: React.ReactNode
  onDragHandlePointerDown: (e: React.PointerEvent, id: WidgetId) => void
  onResizeHandlePointerDown: (e: React.PointerEvent, id: WidgetId) => void
  onRemove?: ((id: WidgetId) => void) | undefined
  isDragging: boolean
}

function GridTile({
  widget,
  rowHeight,
  children,
  onDragHandlePointerDown,
  onResizeHandlePointerDown,
  onRemove,
  isDragging,
}: TileProps) {
  const { id, x, y, w, h } = widget

  const style: React.CSSProperties = {
    gridColumn: `${x + 1} / span ${w}`,
    gridRow: `${y + 1} / span ${h}`,
    minHeight: `${h * rowHeight}px`,
    position: 'relative',
    transition: isDragging ? 'none' : 'box-shadow 0.15s',
  }

  return (
    <div
      data-testid={`widget-tile-${id}`}
      style={style}
      className={[
        'group rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)]',
        isDragging ? 'z-50 shadow-lg ring-2 ring-[var(--ag-accent)]/50' : '',
      ].join(' ')}
    >
      {/* Drag handle */}
      <div
        data-testid={`drag-handle-${id}`}
        aria-label="Drag to reposition widget"
        role="button"
        tabIndex={0}
        onPointerDown={(e) => onDragHandlePointerDown(e, id)}
        className="absolute left-0 right-0 top-0 flex h-6 cursor-grab items-center justify-between rounded-t-lg px-2 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <span className="text-[10px] text-[var(--ag-ink-subtle)]">⠿</span>
        {onRemove && (
          <button
            type="button"
            aria-label="Remove widget"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(id)
            }}
            className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-[var(--ag-ink-subtle)] hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
          >
            ×
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="h-full overflow-auto p-2 pt-6">{children}</div>

      {/* Resize handle (bottom-right corner) */}
      <div
        data-testid={`resize-handle-${id}`}
        aria-label="Drag to resize widget"
        role="button"
        tabIndex={0}
        onPointerDown={(e) => onResizeHandlePointerDown(e, id)}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize opacity-0 transition-opacity group-hover:opacity-100"
        style={{ touchAction: 'none' }}
      >
        <svg
          viewBox="0 0 16 16"
          className="h-full w-full text-[var(--ag-ink-subtle)]"
          aria-hidden
        >
          <path
            d="M12 4L4 12M16 8L8 16M16 12L12 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export function DashboardGrid({ dashboard, ctx, onLayoutChange, onRemoveWidget }: Props) {
  const { widgets, gridCols, gridRowHeight } = dashboard

  // Track which widget is currently being dragged
  const [draggingId, setDraggingId] = useState<WidgetId | null>(null)
  // Optimistic layout during drag (committed on pointer-up)
  const [optimisticWidgets, setOptimisticWidgets] = useState<Widget[]>(widgets)

  // Keep track of current drag state in a ref (avoids stale closure issues)
  const dragState = useRef<DragState | null>(null)
  // Reference to the grid container to calculate cell sizes
  const gridRef = useRef<HTMLDivElement>(null)

  // Sync optimistic widgets when dashboard changes (from outside)
  const prevDashboardId = useRef(dashboard.id)
  if (prevDashboardId.current !== dashboard.id) {
    prevDashboardId.current = dashboard.id
    setOptimisticWidgets(widgets)
  }
  // Sync when widgets change from store while not dragging
  const prevWidgets = useRef(widgets)
  if (prevWidgets.current !== widgets && !draggingId) {
    prevWidgets.current = widgets
    setOptimisticWidgets(widgets)
  }

  // Compute cell width/height from the grid container
  const getCellSize = useCallback((): { cellW: number; cellH: number } => {
    if (!gridRef.current) return { cellW: 80, cellH: gridRowHeight }
    const rect = gridRef.current.getBoundingClientRect()
    return {
      cellW: rect.width / gridCols,
      cellH: gridRowHeight,
    }
  }, [gridCols, gridRowHeight])

  const handleDragHandlePointerDown = useCallback(
    (e: React.PointerEvent, widgetId: WidgetId) => {
      e.preventDefault()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      const w = optimisticWidgets.find((wgt) => wgt.id === widgetId)
      if (!w) return

      dragState.current = {
        widgetId,
        mode: 'move',
        startX: e.clientX,
        startY: e.clientY,
        origX: w.x,
        origY: w.y,
        origW: w.w,
        origH: w.h,
      }
      setDraggingId(widgetId)
    },
    [optimisticWidgets],
  )

  const handleResizeHandlePointerDown = useCallback(
    (e: React.PointerEvent, widgetId: WidgetId) => {
      e.preventDefault()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)

      const w = optimisticWidgets.find((wgt) => wgt.id === widgetId)
      if (!w) return

      dragState.current = {
        widgetId,
        mode: 'resize',
        startX: e.clientX,
        startY: e.clientY,
        origX: w.x,
        origY: w.y,
        origW: w.w,
        origH: w.h,
      }
      setDraggingId(widgetId)
    },
    [optimisticWidgets],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current
      if (!ds) return

      const { cellW, cellH } = getCellSize()
      const dx = Math.round((e.clientX - ds.startX) / cellW)
      const dy = Math.round((e.clientY - ds.startY) / cellH)

      setOptimisticWidgets((prev) =>
        prev.map((w) => {
          if (w.id !== ds.widgetId) return w

          if (ds.mode === 'move') {
            const newX = Math.max(0, Math.min(ds.origX + dx, gridCols - w.w))
            const newY = Math.max(0, ds.origY + dy)
            return { ...w, x: newX, y: newY }
          } else {
            // resize
            const newW = Math.max(1, Math.min(ds.origW + dx, gridCols - ds.origX))
            const newH = Math.max(1, ds.origH + dy)
            return { ...w, w: newW, h: newH }
          }
        }),
      )
    },
    [getCellSize, gridCols],
  )

  const handlePointerUp = useCallback(() => {
    if (!dragState.current) return
    dragState.current = null
    setDraggingId(null)
    // Commit the optimistic layout to the store
    setOptimisticWidgets((current) => {
      onLayoutChange(current)
      return current
    })
  }, [onLayoutChange])

  const handleRemoveWidget = useCallback(
    (widgetId: WidgetId) => {
      onRemoveWidget?.(widgetId)
    },
    [onRemoveWidget],
  )

  const displayed = draggingId ? optimisticWidgets : widgets

  return (
    <div
      ref={gridRef}
      data-testid="dashboard-grid"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridAutoRows: `${gridRowHeight}px`,
        gap: '8px',
        padding: '16px',
        minHeight: '200px',
        touchAction: 'none',
      }}
    >
      {displayed.map((widget) => (
        <GridTile
          key={widget.id}
          widget={widget}
          gridCols={gridCols}
          rowHeight={gridRowHeight}
          isDragging={draggingId === widget.id}
          onDragHandlePointerDown={handleDragHandlePointerDown}
          onResizeHandlePointerDown={handleResizeHandlePointerDown}
          onRemove={onRemoveWidget ? handleRemoveWidget : undefined}
        >
          {renderWidget(widget.kind, ctx)}
        </GridTile>
      ))}

      {displayed.length === 0 && (
        <div
          style={{ gridColumn: `1 / span ${gridCols}` }}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--ag-line)] p-12 text-center"
        >
          <p className="text-sm text-[var(--ag-ink-muted)]">
            This dashboard is empty. Add a widget to get started.
          </p>
        </div>
      )}
    </div>
  )
}
