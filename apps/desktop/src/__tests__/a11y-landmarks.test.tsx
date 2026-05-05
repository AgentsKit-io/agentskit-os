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
import { render, screen, act, fireEvent } from '@testing-library/react'
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
    applyThemeToDocument: () => undefined,
    clearThemeOverrides: () => undefined,
    defaultThemes: { dark: {}, light: {}, cyber: {} },
    applyToken: () => undefined,
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

  it('uses native buttons for primary shell navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /flows/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /benchmark/i })).toBeInTheDocument()
  })

  it('marks the active primary nav item with aria-current', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    expect(screen.getByRole('button', { name: /dashboard/i })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /traces/i }))
    })

    expect(screen.getByRole('button', { name: /traces/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('opens the command palette from the navigation header shortcut button', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toggle command palette/i }))
    })

    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument()
  })

  it('opens the supported Flows screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /flows/i }))
    })

    expect(screen.getByRole('heading', { name: /^flows$/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /flow registry/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /flows is in preview/i })).not.toBeInTheDocument()
  })

  it('opens the supported Runs screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /runs/i }))
    })

    expect(screen.getByRole('heading', { name: /^runs$/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /run queue/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /runs is in preview/i })).not.toBeInTheDocument()
  })

  it('opens the supported Agents screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /agents/i }))
    })

    expect(screen.getByRole('heading', { name: /^agents$/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /agent registry/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /agents is in preview/i })).not.toBeInTheDocument()
  })

  it('opens the supported Triggers screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /triggers/i }))
    })

    expect(screen.getByRole('heading', { name: /^triggers$/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /trigger rules/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /triggers is in preview/i })).not.toBeInTheDocument()
  })

  it('opens the supported HITL Inbox screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /hitl inbox/i }))
    })

    expect(screen.getByRole('heading', { name: /hitl inbox/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /human task inbox/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /hitl inbox is in preview/i })).not.toBeInTheDocument()
  })

  it('opens the supported Benchmark screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /benchmark/i }))
    })

    expect(screen.getByRole('heading', { name: /^benchmark$/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /benchmark results/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /benchmark is in preview/i })).not.toBeInTheDocument()
  })

  it('opens the supported Evals screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /evals/i }))
    })

    expect(screen.getByRole('heading', { name: /^evals$/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /evaluation suites/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /evals is in preview/i })).not.toBeInTheDocument()
  })

  it('opens the supported Cost & Quotas screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cost & quotas/i }))
    })

    expect(screen.getByRole('heading', { name: /cost & quotas/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /cost budgets/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /cost & quotas is in preview/i })).not.toBeInTheDocument()
  })

  it('opens the supported Security screen from primary navigation', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /security/i }))
    })

    expect(screen.getByRole('heading', { name: /^security$/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /security controls/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /security is in preview/i })).not.toBeInTheDocument()
  })

  it('registers the restart onboarding command in the command palette', async () => {
    localStorage.setItem(
      'agentskitos.onboarding',
      JSON.stringify({ completed: true, completedAt: '2026-05-04T00:00:00.000Z' }),
    )

    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })

    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument()
    expect(screen.getByText(/restart onboarding tour/i)).toBeInTheDocument()
  })

  it('does not register supported surface preview commands in the command palette', async () => {
    await act(async () => {
      render(<App />, { container })
    })

    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })

    expect(screen.queryByText(/go to flows/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/go to security/i)).not.toBeInTheDocument()
  })
})
