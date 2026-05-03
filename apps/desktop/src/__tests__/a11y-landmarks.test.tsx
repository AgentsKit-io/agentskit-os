/**
 * A11y landmark tests for the App component.
 *
 * Verifies that the critical ARIA landmark roles required for WCAG 2.4.1
 * (Bypass Blocks) and WCAG 1.3.6 (Identify Purpose) are present:
 *   - banner   (<header>)
 *   - navigation (<nav>)
 *   - main
 *
 * All external dependencies (Tauri, sidecar, os-ui) are mocked so tests
 * run in jsdom without a native runtime.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any imports that touch these modules
// ---------------------------------------------------------------------------

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockRejectedValue(new Error('Tauri not available in tests')),
}))

vi.mock('../lib/sidecar', () => ({
  getSidecarStatus: vi.fn().mockResolvedValue('disconnected'),
  pauseRuns: vi.fn().mockResolvedValue(undefined),
  resumeRuns: vi.fn().mockResolvedValue(undefined),
  sidecarRequest: vi.fn().mockRejectedValue(new Error('sidecar not available')),
  subscribeEvents: vi.fn().mockReturnValue(() => undefined),
}))

vi.mock('../screens/dashboard/use-dashboard-stats', () => ({
  useDashboardStats: () => ({
    stats: { totalRuns24h: 0, liveCostUsd: 0, avgLatencyMs: 0, errorRatePct: 0 },
    isLoading: false,
  }),
}))

vi.mock('../screens/traces/use-traces', () => ({
  useTraces: () => ({ traces: [], loading: false, error: null }),
  useTraceSpans: () => ({ spans: [], loading: false, error: null }),
}))

vi.mock('@agentskit/os-ui', () => {
  let _theme = 'dark'
  return {
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useTheme: () => ({ theme: _theme, resolvedTheme: _theme, setTheme: (t: string) => { _theme = t } }),
    ThemeSwitcher: () => <div data-testid="theme-switcher" />,
    GlassPanel: ({ children, className, role, 'aria-label': ariaLabel, ...rest }: React.HTMLAttributes<HTMLDivElement> & { blur?: string }) => (
      <div className={className} role={role} aria-label={ariaLabel} data-testid={(rest as { 'data-testid'?: string })['data-testid']}>{children}</div>
    ),
    Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
    Button: ({ children, onClick, disabled, className, size: _size, variant: _variant, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string; variant?: string }) => (
      <button onClick={onClick} disabled={disabled} className={className} {...rest}>{children}</button>
    ),
    Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => <span data-variant={variant}>{children}</span>,
    Card: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    CardHeader: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    CardTitle: ({ children, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 {...rest}>{children}</h3>,
    CardDescription: ({ children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) => <p {...rest}>{children}</p>,
    CardContent: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    CardFooter: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    LiveRegion: ({ message }: { message: string }) => (
      <div role="status" aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>{message}</div>
    ),
    SkipToContent: ({ targetId = 'main-content', label = 'Skip to main content' }: { targetId?: string; label?: string }) => (
      <a href={`#${targetId}`} data-testid="skip-to-content">{label}</a>
    ),
  }
})

// ---------------------------------------------------------------------------
// Import App after mocks are established
// ---------------------------------------------------------------------------

const { App } = await import('../app')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('App ARIA landmarks', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('renders a <main> landmark', async () => {
    await act(async () => {
      render(<App />, { container })
    })
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders a <nav> / navigation landmark', async () => {
    await act(async () => {
      render(<App />, { container })
    })
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders a banner landmark (header)', async () => {
    await act(async () => {
      render(<App />, { container })
    })
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders the skip-to-content link', async () => {
    await act(async () => {
      render(<App />, { container })
    })
    expect(screen.getByTestId('skip-to-content')).toBeInTheDocument()
  })

  it('skip-to-content href points to #main-content', async () => {
    await act(async () => {
      render(<App />, { container })
    })
    const link = screen.getByTestId('skip-to-content')
    expect(link.getAttribute('href')).toBe('#main-content')
  })

  it('main landmark has id="main-content"', async () => {
    await act(async () => {
      render(<App />, { container })
    })
    const main = screen.getByRole('main')
    expect(main.id).toBe('main-content')
  })
})
