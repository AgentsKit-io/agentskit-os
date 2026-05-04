/**
 * Tests for WidgetPicker modal.
 *
 * Covers:
 *   - Renders nothing when isOpen=false
 *   - Renders all built-in widget kinds when isOpen=true
 *   - "Add" button calls onAdd with the correct kind and then onClose
 *   - Close button calls onClose
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import { WidgetPicker } from '../widget-picker'
import { BUILT_IN_WIDGETS } from '../widget-registry'

// ---------------------------------------------------------------------------
// Mock os-ui (Button)
// ---------------------------------------------------------------------------

vi.mock('@agentskit/os-ui', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    [key: string]: unknown
  }) => createElement('button', { onClick, ...props }, children),
}))

// jsdom doesn't implement HTMLDialogElement natively; stub minimal methods
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

describe('WidgetPicker', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <WidgetPicker isOpen={false} onClose={vi.fn()} onAdd={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all built-in widget kinds when open', () => {
    render(<WidgetPicker isOpen={true} onClose={vi.fn()} onAdd={vi.fn()} />)
    for (const entry of BUILT_IN_WIDGETS) {
      expect(screen.getByText(entry.label)).toBeInTheDocument()
    }
  })

  it('calls onAdd with the kind and then onClose when Add is clicked', () => {
    const onAdd = vi.fn()
    const onClose = vi.fn()
    render(<WidgetPicker isOpen={true} onClose={onClose} onAdd={onAdd} />)

    const firstKind = BUILT_IN_WIDGETS[0]!.kind
    const addBtn = screen.getByTestId(`add-widget-${firstKind}`)
    fireEvent.click(addBtn)

    expect(onAdd).toHaveBeenCalledWith(firstKind)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<WidgetPicker isOpen={true} onClose={onClose} onAdd={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Close widget picker'))
    expect(onClose).toHaveBeenCalled()
  })
})
