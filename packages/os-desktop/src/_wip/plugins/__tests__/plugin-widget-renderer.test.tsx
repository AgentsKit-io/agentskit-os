/**
 * Tests for PluginWidgetRenderer.
 *
 * Covers:
 *   - Renders a sandboxed iframe with `allow-scripts`
 *   - Uses placeholder HTML when sidecar returns {}
 *   - Shows error state when sidecar throws
 *   - data-testid and aria-label are correct
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { createElement } from 'react'
import { PluginWidgetRenderer } from '../plugin-widget-renderer'

// ---------------------------------------------------------------------------
// Mock sidecar
// ---------------------------------------------------------------------------

const mockSidecarRequest = vi.fn()

vi.mock('../../lib/sidecar', () => ({
  sidecarRequest: (...args: unknown[]) => mockSidecarRequest(...args),
}))

beforeEach(() => {
  mockSidecarRequest.mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PluginWidgetRenderer', () => {
  it('renders an iframe with sandbox="allow-scripts"', async () => {
    await act(async () => {
      render(
        createElement(PluginWidgetRenderer, {
          pluginId: 'demo-plugin',
          kind: 'plugin:demo-plugin:hello',
        }),
      )
    })

    const iframe = screen.getByTestId('plugin-widget-plugin:demo-plugin:hello')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts')
  })

  it('sets aria-label referencing the pluginId', async () => {
    await act(async () => {
      render(
        createElement(PluginWidgetRenderer, {
          pluginId: 'my-plugin',
          kind: 'plugin:my-plugin:foo',
        }),
      )
    })

    expect(
      screen.getByLabelText(/Plugin widget rendered by my-plugin/i),
    ).toBeInTheDocument()
  })

  it('shows placeholder when sidecar returns {} (no Tauri)', async () => {
    mockSidecarRequest.mockResolvedValue({})

    await act(async () => {
      render(
        createElement(PluginWidgetRenderer, {
          pluginId: 'demo-plugin',
          kind: 'plugin:demo-plugin:hello',
        }),
      )
    })

    const iframe = screen.getByTestId('plugin-widget-plugin:demo-plugin:hello')
    // The srcDoc should contain the placeholder text
    expect(iframe.getAttribute('srcdoc')).toContain('pending')
  })

  it('uses the html from sidecar when provided', async () => {
    mockSidecarRequest.mockResolvedValue({ html: '<p>Hello from plugin</p>' })

    await act(async () => {
      render(
        createElement(PluginWidgetRenderer, {
          pluginId: 'demo-plugin',
          kind: 'plugin:demo-plugin:hello',
        }),
      )
    })

    const iframe = screen.getByTestId('plugin-widget-plugin:demo-plugin:hello')
    expect(iframe.getAttribute('srcdoc')).toBe('<p>Hello from plugin</p>')
  })

  it('shows error state when sidecar throws', async () => {
    mockSidecarRequest.mockRejectedValue(new Error('sidecar failed'))

    await act(async () => {
      render(
        createElement(PluginWidgetRenderer, {
          pluginId: 'bad-plugin',
          kind: 'plugin:bad-plugin:broken',
        }),
      )
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toContain('sidecar failed')
  })
})
