/**
 * Tests for MarketplacePanel modal.
 *
 * Covers:
 *   - Renders nothing when isOpen=false
 *   - Renders all curated templates when isOpen=true
 *   - "Use this layout" button calls onApplyTemplate and onClose
 *   - Close button calls onClose
 *   - "Browse remote" button is present and disabled (TODO #234)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import { MarketplacePanel } from '../marketplace-panel'
import { CURATED_TEMPLATES } from '../marketplace-data'

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

describe('MarketplacePanel', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <MarketplacePanel
        isOpen={false}
        onClose={vi.fn()}
        onApplyTemplate={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all curated template names when open', () => {
    render(
      <MarketplacePanel
        isOpen={true}
        onClose={vi.fn()}
        onApplyTemplate={vi.fn()}
      />,
    )
    for (const template of CURATED_TEMPLATES) {
      expect(screen.getByText(template.name)).toBeInTheDocument()
    }
  })

  it('renders template descriptions', () => {
    render(
      <MarketplacePanel
        isOpen={true}
        onClose={vi.fn()}
        onApplyTemplate={vi.fn()}
      />,
    )
    for (const template of CURATED_TEMPLATES) {
      expect(screen.getByText(template.description)).toBeInTheDocument()
    }
  })

  it('calls onApplyTemplate and onClose when "Use this layout" is clicked', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(
      <MarketplacePanel
        isOpen={true}
        onClose={onClose}
        onApplyTemplate={onApply}
      />,
    )

    const firstTemplate = CURATED_TEMPLATES[0]!
    const btn = screen.getByTestId(`apply-template-${firstTemplate.id}`)
    fireEvent.click(btn)

    expect(onApply).toHaveBeenCalledWith(firstTemplate)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <MarketplacePanel
        isOpen={true}
        onClose={onClose}
        onApplyTemplate={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByLabelText('Close marketplace'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders a disabled "Coming soon" button for the remote marketplace (TODO #234)', () => {
    render(
      <MarketplacePanel
        isOpen={true}
        onClose={vi.fn()}
        onApplyTemplate={vi.fn()}
      />,
    )
    const btn = screen.getByTestId('browse-remote-marketplace')
    expect(btn).toBeDisabled()
    expect(btn).toHaveTextContent('Coming soon')
  })
})
