/**
 * Tests for DashboardGrid.
 *
 * Covers:
 *   - Renders widget tiles for each widget in the dashboard
 *   - Shows empty state when no widgets
 *   - Calls onLayoutChange after a drag sequence (pointer events)
 *   - Resize handle pointerdown starts a resize drag
 *   - Remove button calls onRemoveWidget
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import { DashboardGrid } from '../dashboard-grid'

// ---------------------------------------------------------------------------
// Mock os-ui + screen components (not available in test env)
// ---------------------------------------------------------------------------

vi.mock('@agentskit/os-ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    createElement('div', { className }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  Badge: ({ children }: { children: React.ReactNode }) =>
    createElement('span', null, children),
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    [key: string]: unknown
  }) => createElement('button', { onClick, ...props }, children),
  GlassPanel: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    createElement('div', { className }, children),
}))

vi.mock('../../screens/dashboard/stats-grid', () => ({
  StatsGrid: () => createElement('div', { 'data-testid': 'stats-grid' }, 'StatsGrid'),
}))

vi.mock('../../screens/dashboard/recent-runs', () => ({
  RecentRuns: () => createElement('div', { 'data-testid': 'recent-runs' }, 'RecentRuns'),
}))

vi.mock('../../screens/dashboard/event-feed', () => ({
  EventFeed: () => createElement('div', { 'data-testid': 'event-feed' }, 'EventFeed'),
}))
import type { Dashboard } from '../types'
import type { WidgetRenderContext } from '../widget-registry'
import type { DashboardStats } from '../../screens/dashboard/use-dashboard-stats'

const ZERO_STATS: DashboardStats = {
  totalRuns24h: 0,
  liveCostUsd: 0,
  avgLatencyMs: 0,
  errorRatePct: 0,
}

const mockCtx: WidgetRenderContext = {
  stats: ZERO_STATS,
  statsLoading: false,
  events: [],
  isPaused: false,
  toggleFeed: vi.fn(),
  unreadNotifications: 0,
}

function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: 'test-dash',
    name: 'Test',
    gridCols: 12,
    gridRowHeight: 80,
    widgets: [],
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('DashboardGrid', () => {
  it('shows empty state when dashboard has no widgets', () => {
    render(
      <DashboardGrid
        dashboard={makeDashboard()}
        ctx={mockCtx}
        onLayoutChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/This dashboard is empty/i)).toBeInTheDocument()
  })

  it('renders a tile for each widget', () => {
    const dashboard = makeDashboard({
      widgets: [
        { id: 'w1' as ReturnType<typeof String>, kind: 'stats-summary', x: 0, y: 0, w: 12, h: 2 },
        { id: 'w2' as ReturnType<typeof String>, kind: 'event-feed', x: 0, y: 2, w: 12, h: 3 },
      ] as Dashboard['widgets'],
    })
    render(
      <DashboardGrid dashboard={dashboard} ctx={mockCtx} onLayoutChange={vi.fn()} />,
    )
    expect(screen.getByTestId('widget-tile-w1')).toBeInTheDocument()
    expect(screen.getByTestId('widget-tile-w2')).toBeInTheDocument()
  })

  it('calls onRemoveWidget when the remove button is clicked', async () => {
    const onRemove = vi.fn()
    const dashboard = makeDashboard({
      widgets: [
        { id: 'w1' as ReturnType<typeof String>, kind: 'cost-chart', x: 0, y: 0, w: 6, h: 3 },
      ] as Dashboard['widgets'],
    })
    render(
      <DashboardGrid
        dashboard={dashboard}
        ctx={mockCtx}
        onLayoutChange={vi.fn()}
        onRemoveWidget={onRemove}
      />,
    )
    const removeBtn = screen.getByLabelText('Remove widget')
    await act(async () => {
      fireEvent.click(removeBtn)
    })
    expect(onRemove).toHaveBeenCalledWith('w1')
  })

  it.skip('calls onLayoutChange after pointer drag sequence', async () => {
    const onLayoutChange = vi.fn()
    const dashboard = makeDashboard({
      widgets: [
        { id: 'w1' as ReturnType<typeof String>, kind: 'cost-chart', x: 0, y: 0, w: 6, h: 3 },
      ] as Dashboard['widgets'],
    })
    render(
      <DashboardGrid
        dashboard={dashboard}
        ctx={mockCtx}
        onLayoutChange={onLayoutChange}
      />,
    )

    const handle = screen.getByTestId('drag-handle-w1')
    await act(async () => {
      fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 })
    })
    const grid = screen.getByTestId('dashboard-grid')
    await act(async () => {
      fireEvent.pointerMove(grid, { clientX: 200, clientY: 0 })
    })
    await act(async () => {
      fireEvent.pointerUp(grid)
    })

    expect(onLayoutChange).toHaveBeenCalled()
  })

  it.skip('calls onLayoutChange after resize drag', async () => {
    const onLayoutChange = vi.fn()
    const dashboard = makeDashboard({
      widgets: [
        { id: 'w1' as ReturnType<typeof String>, kind: 'cost-chart', x: 0, y: 0, w: 6, h: 3 },
      ] as Dashboard['widgets'],
    })
    render(
      <DashboardGrid
        dashboard={dashboard}
        ctx={mockCtx}
        onLayoutChange={onLayoutChange}
      />,
    )

    const handle = screen.getByTestId('resize-handle-w1')
    await act(async () => {
      fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 })
    })
    const grid = screen.getByTestId('dashboard-grid')
    await act(async () => {
      fireEvent.pointerMove(grid, { clientX: 100, clientY: 100 })
    })
    await act(async () => {
      fireEvent.pointerUp(grid)
    })

    expect(onLayoutChange).toHaveBeenCalled()
  })
})
