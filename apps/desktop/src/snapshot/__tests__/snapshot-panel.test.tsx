/**
 * Tests for SnapshotPanel component — UI flow with file mock.
 *
 * Covers:
 *   - Renders nothing when isOpen=false
 *   - Renders modal when isOpen=true
 *   - Close button calls onClose
 *   - Backdrop click calls onClose
 *   - Export button calls captureSnapshot + exportSnapshotJson + triggers download
 *   - Import button opens the file input
 *   - Valid file import applies snapshot and triggers reload
 *   - Invalid file shows error message
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { SnapshotPanel } from '../snapshot-panel'

// ---------------------------------------------------------------------------
// Mock @agentskit/os-ui
// ---------------------------------------------------------------------------

vi.mock('@agentskit/os-ui', () => ({
  GlassPanel: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode
    className?: string
    [key: string]: unknown
  }) => createElement('div', { className, ...props }, children),
}))

// ---------------------------------------------------------------------------
// Mock snapshot-store
// ---------------------------------------------------------------------------

const mockCaptureSnapshot = vi.fn(() => ({
  version: 1 as const,
  createdAt: '2026-05-02T00:00:00.000Z',
  state: { 'agentskit:theme': 'dark' },
}))
const mockExportSnapshotJson = vi.fn(() => '{"version":1,"createdAt":"2026-05-02T00:00:00.000Z","state":{}}')
const mockImportSnapshotJson = vi.fn()
const mockApplySnapshot = vi.fn()

vi.mock('../snapshot-store', () => ({
  captureSnapshot: () => mockCaptureSnapshot(),
  exportSnapshotJson: (s: unknown) => mockExportSnapshotJson(s),
  importSnapshotJson: (t: string) => mockImportSnapshotJson(t),
  applySnapshot: (s: unknown) => mockApplySnapshot(s),
}))

// ---------------------------------------------------------------------------
// Mock window.location.reload
// ---------------------------------------------------------------------------

const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPanel(
  props: { isOpen: boolean | undefined; onClose: (() => void) | undefined } | undefined = undefined,
) {
  const safeProps = props !== undefined ? props : { isOpen: undefined, onClose: undefined }
  const onClose = safeProps.onClose !== undefined ? safeProps.onClose : vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    const isOpen = safeProps.isOpen !== undefined ? safeProps.isOpen : true
    root.render(
      createElement(SnapshotPanel, {
        isOpen,
        onClose,
      }),
    )
  })
  return { container, root, onClose }
}

function cleanup(container: HTMLElement, root: ReturnType<typeof createRoot>) {
  act(() => root.unmount())
  container.remove()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SnapshotPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: importSnapshotJson returns a valid snapshot
    mockImportSnapshotJson.mockReturnValue({
      version: 1,
      createdAt: '2026-05-02T00:00:00.000Z',
      state: {},
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when isOpen is false', () => {
    const { container, root } = renderPanel({ isOpen: false })
    expect(container.querySelector('[data-testid="snapshot-panel"]')).toBeNull()
    cleanup(container, root)
  })

  it('renders the modal when isOpen is true', () => {
    const { container, root } = renderPanel({ isOpen: true })
    expect(container.querySelector('[data-testid="snapshot-panel"]')).not.toBeNull()
    cleanup(container, root)
  })

  it('calls onClose when the header close button is clicked', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel({ onClose })
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="close-snapshot"]')
    act(() => btn?.click())
    expect(onClose).toHaveBeenCalledTimes(1)
    cleanup(container, root)
  })

  it('calls onClose when the footer close button is clicked', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel({ onClose })
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="snapshot-close-footer"]')
    act(() => btn?.click())
    expect(onClose).toHaveBeenCalledTimes(1)
    cleanup(container, root)
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container, root } = renderPanel({ onClose })
    const backdrop = container.querySelector<HTMLDivElement>('[data-testid="snapshot-backdrop"]')
    act(() => backdrop?.click())
    expect(onClose).toHaveBeenCalledTimes(1)
    cleanup(container, root)
  })

  it('calls captureSnapshot and exportSnapshotJson when Export is clicked', () => {
    // Spy on document.createElement to intercept the anchor click
    const originalCreateElement = document.createElement.bind(document)
    const clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const a = originalCreateElement('a')
        a.click = clickSpy
        return a
      }
      return originalCreateElement(tag)
    })

    const { container, root } = renderPanel()
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="export-snapshot"]')
    act(() => btn?.click())

    expect(mockCaptureSnapshot).toHaveBeenCalledTimes(1)
    expect(mockExportSnapshotJson).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)

    vi.restoreAllMocks()
    cleanup(container, root)
  })

  it('shows the file input when Import is clicked', () => {
    const { container, root } = renderPanel()
    const input = container.querySelector<HTMLInputElement>('[data-testid="snapshot-file-input"]')
    expect(input).not.toBeNull()
    expect(input?.type).toBe('file')
    cleanup(container, root)
  })

  it('applies snapshot and shows success message on valid file import', async () => {
    vi.useFakeTimers()
    const { container, root } = renderPanel()

    const input = container.querySelector<HTMLInputElement>('[data-testid="snapshot-file-input"]')
    expect(input).not.toBeNull()

    const validJson = '{"version":1,"createdAt":"2026-05-02T00:00:00.000Z","state":{}}'
    const file = new File([validJson], 'snap.json', { type: 'application/json' })

    // Simulate FileReader behaviour by mocking the constructor
    const originalFileReader = globalThis.FileReader
    const mockRead = vi.fn()
    class MockFileReader {
      onload: ((e: ProgressEvent<FileReader>) => void) | null = null
      onerror: (() => void) | null = null
      result: string | null = null
      readAsText(_f: Blob) {
        mockRead(_f)
        setTimeout(() => {
          this.result = validJson
          this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>)
        }, 0)
      }
    }
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader

    act(() => {
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Flush the FileReader setTimeout
    await act(async () => {
      vi.runAllTimers()
    })

    expect(mockImportSnapshotJson).toHaveBeenCalledWith(validJson)
    expect(mockApplySnapshot).toHaveBeenCalledTimes(1)

    const success = container.querySelector('[data-testid="import-success"]')
    expect(success).not.toBeNull()

    // Flush the reload setTimeout (800ms)
    await act(async () => {
      vi.runAllTimers()
    })
    expect(mockReload).toHaveBeenCalledTimes(1)

    globalThis.FileReader = originalFileReader
    cleanup(container, root)
  })

  it('shows an error message when the imported file is invalid', async () => {
    mockImportSnapshotJson.mockImplementation(() => {
      throw new Error('bad schema')
    })

    const { container, root } = renderPanel()
    const input = container.querySelector<HTMLInputElement>('[data-testid="snapshot-file-input"]')

    const badJson = '{"not":"a snapshot"}'
    const file = new File([badJson], 'bad.json', { type: 'application/json' })

    const originalFileReader = globalThis.FileReader
    class MockFileReader {
      onload: ((e: ProgressEvent<FileReader>) => void) | null = null
      onerror: (() => void) | null = null
      result: string | null = null
      readAsText(_f: Blob) {
        setTimeout(() => {
          this.result = badJson
          this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>)
        }, 0)
      }
    }
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader

    act(() => {
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      })
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    const errorEl = container.querySelector('[data-testid="import-error"]')
    expect(errorEl).not.toBeNull()
    expect(errorEl?.textContent).toContain('bad schema')

    globalThis.FileReader = originalFileReader
    cleanup(container, root)
  })
})
