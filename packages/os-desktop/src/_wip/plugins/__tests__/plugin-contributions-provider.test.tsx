/**
 * Tests for PluginContributionsProvider and usePluginContributions().
 *
 * Covers:
 *   - Provider renders children
 *   - usePluginContributions() returns stub dashboards and widgets
 *   - Throws when used outside provider
 *   - refresh() is a function
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { createElement, useEffect } from 'react'
import {
  PluginContributionsProvider,
  usePluginContributions,
} from '../plugin-contributions-provider'

// ---------------------------------------------------------------------------
// Mock sidecar — always returns {} (no Tauri in tests)
// ---------------------------------------------------------------------------

vi.mock('../../lib/sidecar', () => ({
  sidecarRequest: vi.fn().mockResolvedValue({}),
}))

// ---------------------------------------------------------------------------
// Helper consumer
// ---------------------------------------------------------------------------

type CaptureResult = {
  dashboardCount: number
  widgetCount: number
  hasRefresh: boolean
  firstWidgetKind?: string
  firstDashboardName?: string
}

function Consumer({ onCapture }: { onCapture: (r: CaptureResult) => void }) {
  const { dashboards, widgets, refresh } = usePluginContributions()
  useEffect(() => {
    onCapture({
      dashboardCount: dashboards.length,
      widgetCount: widgets.length,
      hasRefresh: typeof refresh === 'function',
      firstWidgetKind: widgets[0]?.kind,
      firstDashboardName: dashboards[0]?.layout.name,
    })
  }, [dashboards, widgets, refresh, onCapture])
  return createElement('span', { 'data-testid': 'consumer' }, 'ok')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PluginContributionsProvider', () => {
  it('renders children', () => {
    render(
      createElement(
        PluginContributionsProvider,
        null,
        createElement('span', { 'data-testid': 'child' }, 'hello'),
      ),
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('provides stub dashboard and widget when sidecar returns {}', async () => {
    const results: CaptureResult[] = []
    await act(async () => {
      render(
        createElement(
          PluginContributionsProvider,
          null,
          createElement(Consumer, { onCapture: (r) => results.push(r) }),
        ),
      )
    })

    const last = results[results.length - 1]!
    expect(last.dashboardCount).toBeGreaterThanOrEqual(1)
    expect(last.widgetCount).toBeGreaterThanOrEqual(1)
    expect(last.hasRefresh).toBe(true)
    expect(last.firstWidgetKind).toMatch(/^plugin:/)
    expect(typeof last.firstDashboardName).toBe('string')
  })

  it('refresh is callable without throwing', async () => {
    let capturedRefresh: (() => void) | undefined

    function RefreshCapture() {
      const { refresh } = usePluginContributions()
      useEffect(() => {
        capturedRefresh = refresh
      }, [refresh])
      return null
    }

    await act(async () => {
      render(
        createElement(
          PluginContributionsProvider,
          null,
          createElement(RefreshCapture),
        ),
      )
    })

    expect(() => capturedRefresh?.()).not.toThrow()
  })
})

describe('usePluginContributions outside provider', () => {
  it('throws an error', () => {
    const originalConsoleError = console.error
    console.error = vi.fn()

    function BareConsumer() {
      usePluginContributions()
      return null
    }

    expect(() => render(createElement(BareConsumer))).toThrow(
      /usePluginContributions must be used within a PluginContributionsProvider/,
    )

    console.error = originalConsoleError
  })
})
