/**
 * Tests for CustomWidgetEditor modal.
 *
 * Covers:
 *   - Renders nothing when isOpen=false
 *   - Renders form fields when isOpen=true
 *   - Shows validation error when title is empty
 *   - Shows validation error when source method is empty
 *   - Calls onSaved with the widget data on valid save
 *   - Calls onClose when cancel is clicked
 *   - Pre-populates form when editing an existing widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import { CustomWidgetEditor } from '../custom-widget-editor'
import type { CustomWidget } from '../custom-widget-types'

// ---------------------------------------------------------------------------
// Mock @agentskit/os-ui
// ---------------------------------------------------------------------------

vi.mock('@agentskit/os-ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    [key: string]: unknown
  }) => createElement('button', { onClick, disabled, ...props }, children),
}))

// ---------------------------------------------------------------------------
// Mock custom-widget-store (avoid localStorage side-effects in editor tests)
// ---------------------------------------------------------------------------

vi.mock('../custom-widget-store', () => ({
  saveCustomWidget: vi.fn(),
  makeCustomWidgetId: () => 'generated-id-123',
}))

// jsdom dialog stubs
beforeEach(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWidget(overrides?: Partial<CustomWidget>): CustomWidget {
  return {
    id: 'cw-existing',
    title: 'Existing Widget',
    kind: 'number',
    source: { method: 'metrics.existing', pathExpr: 'value', pollMs: 3000 },
    format: { prefix: '$', suffix: '', precision: 2 },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CustomWidgetEditor', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CustomWidgetEditor isOpen={false} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders form fields when isOpen is true', () => {
    render(<CustomWidgetEditor isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByTestId('cwe-title')).toBeInTheDocument()
    expect(screen.getByTestId('cwe-kind')).toBeInTheDocument()
    expect(screen.getByTestId('cwe-method')).toBeInTheDocument()
    expect(screen.getByTestId('cwe-path')).toBeInTheDocument()
    expect(screen.getByTestId('cwe-poll')).toBeInTheDocument()
    expect(screen.getByTestId('cwe-save')).toBeInTheDocument()
  })

  it('shows validation error when title is empty', () => {
    render(<CustomWidgetEditor isOpen={true} onClose={vi.fn()} />)
    // method also needs a value to avoid that error first
    fireEvent.change(screen.getByTestId('cwe-method'), {
      target: { value: 'some.method' },
    })
    fireEvent.click(screen.getByTestId('cwe-save'))
    expect(screen.getByText('Title is required')).toBeInTheDocument()
  })

  it('shows validation error when source method is empty', () => {
    render(<CustomWidgetEditor isOpen={true} onClose={vi.fn()} />)
    fireEvent.change(screen.getByTestId('cwe-title'), {
      target: { value: 'My Widget' },
    })
    fireEvent.click(screen.getByTestId('cwe-save'))
    expect(screen.getByText('Source method is required')).toBeInTheDocument()
  })

  it('calls onSaved and onClose on valid save', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(
      <CustomWidgetEditor isOpen={true} onClose={onClose} onSaved={onSaved} />,
    )

    fireEvent.change(screen.getByTestId('cwe-title'), {
      target: { value: 'My Metric' },
    })
    fireEvent.change(screen.getByTestId('cwe-method'), {
      target: { value: 'metrics.foo' },
    })
    fireEvent.click(screen.getByTestId('cwe-save'))

    expect(onSaved).toHaveBeenCalledOnce()
    const saved: CustomWidget = onSaved.mock.calls[0]![0]
    expect(saved.title).toBe('My Metric')
    expect(saved.source.method).toBe('metrics.foo')
    expect(saved.id).toBe('generated-id-123')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<CustomWidgetEditor isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('pre-populates form with existing widget data', () => {
    const widget = makeWidget()
    render(<CustomWidgetEditor isOpen={true} onClose={vi.fn()} initial={widget} />)
    expect(screen.getByTestId<HTMLInputElement>('cwe-title').value).toBe('Existing Widget')
    expect(screen.getByTestId<HTMLInputElement>('cwe-method').value).toBe('metrics.existing')
    expect(screen.getByTestId<HTMLInputElement>('cwe-path').value).toBe('value')
  })

  it('preserves widget id when editing', () => {
    const widget = makeWidget()
    const onSaved = vi.fn()
    render(
      <CustomWidgetEditor isOpen={true} onClose={vi.fn()} initial={widget} onSaved={onSaved} />,
    )
    fireEvent.click(screen.getByTestId('cwe-save'))
    expect(onSaved).toHaveBeenCalledOnce()
    const saved: CustomWidget = onSaved.mock.calls[0]![0]
    expect(saved.id).toBe('cw-existing')
  })
})
