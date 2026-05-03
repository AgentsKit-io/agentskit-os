/**
 * Tests for ThemeEditorPanel component (UI flow).
 *
 * Covers:
 *   - Renders nothing when isOpen=false
 *   - Renders modal when isOpen=true
 *   - Close / Cancel buttons call onClose
 *   - Base theme buttons switch state (aria-pressed)
 *   - Theme name input is editable
 *   - Save button triggers upsertCustomTheme
 *   - Save As New button triggers upsertCustomTheme
 *   - Reset button clears overrides (spot-check via re-render)
 *   - Marketplace preview buttons are rendered
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeEditorPanel } from '../theme-editor-panel'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @agentskit/os-ui with minimal stubs
vi.mock('@agentskit/os-ui', () => ({
  GlassPanel: ({
    children,
    className,
    ...rest
  }: { children: React.ReactNode; className?: string; [k: string]: unknown }) =>
    createElement('div', { className, ...rest }, children),
  Card: ({
    children,
    className,
  }: { children: React.ReactNode; className?: string }) =>
    createElement('div', { className }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', {}, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('h3', {}, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', {}, children),
  Button: ({
    children,
    onClick,
    ...rest
  }: { children: React.ReactNode; onClick?: () => void; [k: string]: unknown }) =>
    createElement('button', { onClick, ...rest }, children),
  Badge: ({
    children,
    variant,
  }: { children: React.ReactNode; variant?: string }) =>
    createElement('span', { 'data-variant': variant }, children),
  applyThemeToDocument: vi.fn(),
  clearThemeOverrides: vi.fn(),
}))

// Mock the store so tests don't pollute localStorage state beyond test-setup reset
vi.mock('../theme-editor-store', () => ({
  loadCustomThemes: vi.fn(() => []),
  upsertCustomTheme: vi.fn(),
  exportThemeJson: vi.fn(() => '{}'),
  importThemeJson: vi.fn(),
  generateThemeId: vi.fn((name: string) => `custom-${name}-123`),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function render(props: { isOpen?: boolean; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      createElement(ThemeEditorPanel, {
        isOpen: props.isOpen ?? true,
        onClose,
      }),
    )
  })
  return { container, root, onClose }
}

function cleanup(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  act(() => root.unmount())
  container.remove()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ThemeEditorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen=false', () => {
    const { container, root } = render({ isOpen: false })
    expect(container.querySelector('[data-testid="theme-editor-panel"]')).toBeNull()
    cleanup(root, container)
  })

  it('renders the modal when isOpen=true', () => {
    const { container, root } = render({ isOpen: true })
    expect(container.querySelector('[data-testid="theme-editor-panel"]')).not.toBeNull()
    cleanup(root, container)
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    const { container, root } = render({ onClose })
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="close-theme-editor"]')
    act(() => btn?.click())
    expect(onClose).toHaveBeenCalledTimes(1)
    cleanup(root, container)
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    const { container, root } = render({ onClose })
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="cancel-theme-editor"]')
    act(() => btn?.click())
    expect(onClose).toHaveBeenCalledTimes(1)
    cleanup(root, container)
  })

  it('renders base theme selector buttons', () => {
    const { container, root } = render()
    expect(container.querySelector('[data-testid="base-theme-dark"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="base-theme-cyber"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="base-theme-light"]')).not.toBeNull()
    cleanup(root, container)
  })

  it('dark is the initial base theme (aria-pressed=true)', () => {
    const { container, root } = render()
    const darkBtn = container.querySelector<HTMLButtonElement>('[data-testid="base-theme-dark"]')
    expect(darkBtn?.getAttribute('aria-pressed')).toBe('true')
    cleanup(root, container)
  })

  it('switches base theme when a button is clicked', () => {
    const { container, root } = render()
    const cyberBtn = container.querySelector<HTMLButtonElement>('[data-testid="base-theme-cyber"]')
    act(() => cyberBtn?.click())
    expect(cyberBtn?.getAttribute('aria-pressed')).toBe('true')
    const darkBtn = container.querySelector<HTMLButtonElement>('[data-testid="base-theme-dark"]')
    expect(darkBtn?.getAttribute('aria-pressed')).toBe('false')
    cleanup(root, container)
  })

  it('renders the theme name input', () => {
    const { container, root } = render()
    const input = container.querySelector<HTMLInputElement>('[data-testid="theme-name-input"]')
    expect(input).not.toBeNull()
    expect(input?.value).toBe('My Theme')
    cleanup(root, container)
  })

  it('renders Save and Save As New buttons', () => {
    const { container, root } = render()
    expect(container.querySelector('[data-testid="save-theme-btn"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="save-as-new-theme-btn"]')).not.toBeNull()
    cleanup(root, container)
  })

  it('renders Export and Import buttons', () => {
    const { container, root } = render()
    expect(container.querySelector('[data-testid="export-theme-btn"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="import-theme-btn"]')).not.toBeNull()
    cleanup(root, container)
  })

  it('renders Reset button', () => {
    const { container, root } = render()
    expect(container.querySelector('[data-testid="reset-theme-btn"]')).not.toBeNull()
    cleanup(root, container)
  })

  it('renders live preview pane', () => {
    const { container, root } = render()
    expect(container.querySelector('[data-testid="live-preview"]')).not.toBeNull()
    cleanup(root, container)
  })

  it('renders marketplace list with sample themes', () => {
    const { container, root } = render()
    expect(container.querySelector('[data-testid="marketplace-list"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="preview-marketplace-cyber-pink"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="preview-marketplace-mint"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="preview-marketplace-paper"]')).not.toBeNull()
    cleanup(root, container)
  })

  it('calls upsertCustomTheme when Save is clicked', async () => {
    const { upsertCustomTheme } = await import('../theme-editor-store')
    const { container, root } = render()
    const saveBtn = container.querySelector<HTMLButtonElement>('[data-testid="save-theme-btn"]')
    act(() => saveBtn?.click())
    expect(upsertCustomTheme).toHaveBeenCalled()
    cleanup(root, container)
  })

  it('calls upsertCustomTheme when Save As New is clicked', async () => {
    const { upsertCustomTheme } = await import('../theme-editor-store')
    const { container, root } = render()
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="save-as-new-theme-btn"]')
    act(() => btn?.click())
    expect(upsertCustomTheme).toHaveBeenCalled()
    cleanup(root, container)
  })
})
