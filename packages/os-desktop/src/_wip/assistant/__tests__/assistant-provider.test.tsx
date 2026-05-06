/**
 * Tests for AssistantProvider and useAssistant.
 *
 * Covers:
 *   - starts closed with null target
 *   - openFor() sets target and opens the overlay
 *   - close() resets state
 *   - Cmd+I on a focused element with data-assist-target opens overlay
 *   - Cmd+I on element without data-assist-target does nothing
 *   - useAssistant throws outside provider
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { AssistantProvider, useAssistant } from '../assistant-provider'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function StateDisplay(): React.JSX.Element {
  const { isOpen, currentTarget } = useAssistant()
  return (
    <>
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="target-id">{currentTarget?.id ?? 'none'}</span>
      <span data-testid="target-kind">{currentTarget?.kind ?? 'none'}</span>
    </>
  )
}

function OpenButton(): React.JSX.Element {
  const { openFor } = useAssistant()
  return (
    <button
      type="button"
      data-testid="open-btn"
      onClick={() => openFor({ id: 'test-node', kind: 'flow-node' })}
    >
      Open
    </button>
  )
}

function CloseButton(): React.JSX.Element {
  const { close } = useAssistant()
  return (
    <button type="button" data-testid="close-btn" onClick={close}>
      Close
    </button>
  )
}

function TestHarness(): React.JSX.Element {
  return (
    <AssistantProvider>
      <StateDisplay />
      <OpenButton />
      <CloseButton />
    </AssistantProvider>
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AssistantProvider', () => {
  it('starts closed with null target', () => {
    render(<TestHarness />)
    expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
    expect(screen.getByTestId('target-id')).toHaveTextContent('none')
  })

  it('openFor() sets target and opens', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    expect(screen.getByTestId('is-open')).toHaveTextContent('open')
    expect(screen.getByTestId('target-id')).toHaveTextContent('test-node')
    expect(screen.getByTestId('target-kind')).toHaveTextContent('flow-node')
  })

  it('close() resets state', () => {
    render(<TestHarness />)
    fireEvent.click(screen.getByTestId('open-btn'))
    fireEvent.click(screen.getByTestId('close-btn'))
    expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
    expect(screen.getByTestId('target-id')).toHaveTextContent('none')
  })

  it('Cmd+I on a focused element with data-assist-target opens overlay', () => {
    // Render a dummy element with the data attribute and simulate focus
    const { container } = render(
      <AssistantProvider>
        <StateDisplay />
        <button
          type="button"
          data-testid="target-el"
          data-assist-target="node-42"
          data-assist-kind="agent"
        >
          Focusable
        </button>
      </AssistantProvider>,
    )

    // Simulate the element being focused (activeElement)
    const el = container.querySelector('[data-assist-target="node-42"]') as HTMLElement
    el.focus()

    act(() => {
      fireEvent.keyDown(window, { key: 'i', metaKey: true })
    })

    expect(screen.getByTestId('is-open')).toHaveTextContent('open')
    expect(screen.getByTestId('target-id')).toHaveTextContent('node-42')
    expect(screen.getByTestId('target-kind')).toHaveTextContent('agent')
  })

  it('Cmd+I on element without data-assist-target does nothing', () => {
    render(<TestHarness />)

    // No focused element with data-assist-target
    act(() => {
      fireEvent.keyDown(window, { key: 'i', metaKey: true })
    })

    expect(screen.getByTestId('is-open')).toHaveTextContent('closed')
  })

  it('Ctrl+I also triggers the shortcut', () => {
    const { container } = render(
      <AssistantProvider>
        <StateDisplay />
        <button
          type="button"
          data-testid="target-el"
          data-assist-target="node-ctrl"
          data-assist-kind="config-field"
        >
          Focusable
        </button>
      </AssistantProvider>,
    )

    const el = container.querySelector('[data-assist-target="node-ctrl"]') as HTMLElement
    el.focus()

    act(() => {
      fireEvent.keyDown(window, { key: 'i', ctrlKey: true })
    })

    expect(screen.getByTestId('is-open')).toHaveTextContent('open')
  })

  it('useAssistant throws when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<StateDisplay />)).toThrow()
    spy.mockRestore()
  })
})
