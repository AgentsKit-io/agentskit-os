/**
 * Tests for StatusLineConfigPanel.
 *
 * Covers:
 *   - Returns null when isOpen=false
 *   - Renders dialog when isOpen=true
 *   - Renders a checkbox row for each built-in segment
 *   - Toggling a checkbox calls setVisible
 *   - Up / Down buttons call reorder with the correct ids
 *   - Reset button calls reset
 *   - Done / close buttons call onClose
 */

import { describe, it, expect, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { StatusLineConfigPanel } from '../status-line-config-panel'
import { StatusLineProvider } from '../status-line-provider'
import { BUILT_IN_SEGMENTS } from '../status-segments'

// ---------------------------------------------------------------------------
// Mock the status line context for direct call verification
// ---------------------------------------------------------------------------

type MockCtxValue = {
  visibleIds: string[]
  setVisible: ReturnType<typeof vi.fn>
  reorder: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
}

let _mockCtx: MockCtxValue | null = null

vi.mock('../status-line-provider', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../status-line-provider')>()
  return {
    ...mod,
    useStatusLineConfig: () => {
      if (_mockCtx) return _mockCtx
      // Fall through to real context when mock is not active
      return mod.useStatusLineConfig()
    },
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPanel(
  isOpen: boolean,
  onClose: () => void,
  initialIds?: string[],
): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      createElement(
        StatusLineProvider,
        { initialIds },
        createElement(StatusLineConfigPanel, { isOpen, onClose }),
      ),
    )
  })

  return { container, root }
}

function renderPanelWithMock(
  isOpen: boolean,
  onClose: () => void,
  visibleIds: string[],
): { container: HTMLDivElement; root: ReturnType<typeof createRoot> } {
  _mockCtx = {
    visibleIds,
    setVisible: vi.fn(),
    reorder: vi.fn(),
    reset: vi.fn(),
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(createElement(StatusLineConfigPanel, { isOpen, onClose }))
  })

  return { container, root }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatusLineConfigPanel', () => {
  afterEach(() => {
    _mockCtx = null
    localStorage.clear()
  })

  it('renders nothing when isOpen=false', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel(false, onClose)
    const panel = container.querySelector('[data-testid="status-line-config-panel"]')
    expect(panel).toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('renders dialog when isOpen=true', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel(true, onClose)
    const panel = container.querySelector('[data-testid="status-line-config-panel"]')
    expect(panel).not.toBeNull()
    act(() => root.unmount())
    container.remove()
  })

  it('renders a row for every built-in segment', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel(true, onClose)
    for (const seg of BUILT_IN_SEGMENTS) {
      expect(
        container.querySelector(`[data-testid="segment-row-${seg.id}"]`),
      ).not.toBeNull()
    }
    act(() => root.unmount())
    container.remove()
  })

  it('clicking the close button calls onClose', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel(true, onClose)
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="close-status-line-config"]',
    )
    act(() => { btn?.click() })
    expect(onClose).toHaveBeenCalledOnce()
    act(() => root.unmount())
    container.remove()
  })

  it('clicking Done calls onClose', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel(true, onClose)
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="close-status-line-config-done"]',
    )
    act(() => { btn?.click() })
    expect(onClose).toHaveBeenCalledOnce()
    act(() => root.unmount())
    container.remove()
  })

  it('checking a hidden segment checkbox calls setVisible(id, true)', () => {
    const onClose = vi.fn()
    // Only 'workspace' visible; 'theme' is hidden
    const { container, root } = renderPanelWithMock(true, onClose, ['workspace'])

    const checkbox = container.querySelector<HTMLInputElement>(
      '[data-testid="segment-toggle-theme"]',
    )
    expect(checkbox).not.toBeNull()
    // Simulate a React change event via direct click on the label / checkbox
    act(() => {
      if (checkbox) checkbox.click()
    })

    expect(_mockCtx?.setVisible).toHaveBeenCalledWith('theme', true)

    act(() => root.unmount())
    container.remove()
  })

  it('unchecking a visible segment checkbox calls setVisible(id, false)', () => {
    const onClose = vi.fn()
    // Both 'workspace' and 'theme' visible
    const { container, root } = renderPanelWithMock(true, onClose, ['workspace', 'theme'])

    const checkbox = container.querySelector<HTMLInputElement>(
      '[data-testid="segment-toggle-workspace"]',
    )
    expect(checkbox?.checked).toBe(true)
    act(() => {
      if (checkbox) checkbox.click()
    })

    expect(_mockCtx?.setVisible).toHaveBeenCalledWith('workspace', false)

    act(() => root.unmount())
    container.remove()
  })

  it('clicking Reset calls reset()', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanelWithMock(true, onClose, ['workspace'])

    const resetBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="reset-status-line"]',
    )
    act(() => { resetBtn?.click() })
    expect(_mockCtx?.reset).toHaveBeenCalledOnce()

    act(() => root.unmount())
    container.remove()
  })

  it('up button moves a segment earlier in the list', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel(true, onClose, ['workspace', 'theme', 'time'])

    // 'theme' is at index 1; move it up to index 0
    const upBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="segment-up-theme"]',
    )
    expect(upBtn?.disabled).toBe(false)
    act(() => { upBtn?.click() })

    // After move, 'theme' should now be first (its up button should be disabled)
    const themeUpAfter = container.querySelector<HTMLButtonElement>(
      '[data-testid="segment-up-theme"]',
    )
    expect(themeUpAfter?.disabled).toBe(true)

    act(() => root.unmount())
    container.remove()
  })

  it('down button moves a segment later in the list', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel(true, onClose, ['workspace', 'theme', 'time'])

    // 'theme' is at index 1; move it down to index 2
    const downBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="segment-down-theme"]',
    )
    expect(downBtn?.disabled).toBe(false)
    act(() => { downBtn?.click() })

    // After move, 'theme' should now be last (its down button should be disabled)
    const themeDownAfter = container.querySelector<HTMLButtonElement>(
      '[data-testid="segment-down-theme"]',
    )
    expect(themeDownAfter?.disabled).toBe(true)

    act(() => root.unmount())
    container.remove()
  })
})
