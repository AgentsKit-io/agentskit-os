/**
 * Tests for ShortcutsPanel UI component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { ShortcutProvider } from '../shortcut-provider'
import { ShortcutsPanel } from '../shortcuts-panel'

// Stub os-ui
vi.mock('@agentskit/os-ui', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
  GlassPanel: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode
    className?: string
    onClick?: (e: React.MouseEvent) => void
  }) => createElement('div', { className, onClick, 'data-testid': 'glass-panel' }, children),
  Kbd: ({ children }: { children: React.ReactNode }) => createElement('kbd', {}, children),
}))

function renderPanel(onClose = vi.fn()) {
  return createElement(
    ShortcutProvider,
    null,
    createElement(ShortcutsPanel, { onClose }),
  )
}

describe('ShortcutsPanel', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
  })

  it('renders a dialog with aria label', () => {
    act(() => { root.render(renderPanel()) })
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-label')).toBe('Keyboard shortcuts')
  })

  it('renders all 13 shortcut rows', () => {
    act(() => { root.render(renderPanel()) })
    const rows = container.querySelectorAll('[data-testid^="shortcut-row-"]')
    expect(rows.length).toBe(13)
  })

  it('renders category headings', () => {
    act(() => { root.render(renderPanel()) })
    const headings = container.querySelectorAll('h3')
    const texts = Array.from(headings).map((h) => h.textContent?.toLowerCase())
    expect(texts.some((t) => t?.includes('navigation'))).toBe(true)
    expect(texts.some((t) => t?.includes('view'))).toBe(true)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    act(() => { root.render(renderPanel(onClose)) })
    const closeBtn = container.querySelector('[aria-label="Close keyboard shortcuts"]')
    expect(closeBtn).not.toBeNull()
    act(() => { (closeBtn as HTMLButtonElement).click() })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed (no recording)', () => {
    const onClose = vi.fn()
    act(() => { root.render(renderPanel(onClose)) })
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows recording preview when a binding button is clicked', () => {
    act(() => { root.render(renderPanel()) })
    const bindingBtn = container.querySelector('[data-testid="binding-palette.toggle"]') as HTMLButtonElement
    expect(bindingBtn).not.toBeNull()
    act(() => { bindingBtn.click() })
    const preview = container.querySelector('[data-testid="recording-preview"]')
    expect(preview).not.toBeNull()
  })

  it('shows Save and Cancel buttons during recording', () => {
    act(() => { root.render(renderPanel()) })
    const bindingBtn = container.querySelector('[data-testid="binding-palette.toggle"]') as HTMLButtonElement
    act(() => { bindingBtn.click() })
    const buttons = Array.from(container.querySelectorAll('button')).map((b) => b.textContent)
    expect(buttons).toContain('Save')
    expect(buttons).toContain('Cancel')
  })

  it('exits recording when Cancel is clicked', () => {
    act(() => { root.render(renderPanel()) })
    const bindingBtn = container.querySelector('[data-testid="binding-palette.toggle"]') as HTMLButtonElement
    act(() => { bindingBtn.click() })

    const cancelBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancel',
    ) as HTMLButtonElement
    act(() => { cancelBtn.click() })

    expect(container.querySelector('[data-testid="recording-preview"]')).toBeNull()
  })

  it('Reset All button is present', () => {
    act(() => { root.render(renderPanel()) })
    const buttons = Array.from(container.querySelectorAll('button')).map((b) => b.textContent)
    expect(buttons).toContain('Reset All')
  })

  it('Export button is present', () => {
    act(() => { root.render(renderPanel()) })
    const buttons = Array.from(container.querySelectorAll('button')).map((b) => b.textContent)
    expect(buttons).toContain('Export')
  })

  it('Import button is present', () => {
    act(() => { root.render(renderPanel()) })
    const buttons = Array.from(container.querySelectorAll('button')).map((b) => b.textContent)
    expect(buttons).toContain('Import')
  })
})
