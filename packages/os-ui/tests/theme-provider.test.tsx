import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { ThemeProvider, useTheme } from '../src/theme/theme-provider'

function ThemeDisplay(): React.JSX.Element {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('provides default dark theme', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
  })

  it('sets data-theme on documentElement', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>,
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('updates data-theme when setTheme is called', async () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>,
    )
    await act(async () => {
      screen.getByText('Set Light').click()
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('initializes with light theme when defaultTheme is light', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeDisplay />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('throws when useTheme is used outside ThemeProvider', () => {
    const original = console.error
    console.error = () => {}
    expect(() => render(<ThemeDisplay />)).toThrow(
      'useTheme must be used within a ThemeProvider',
    )
    console.error = original
  })

  it('resolves system theme to dark or light', () => {
    render(
      <ThemeProvider defaultTheme="system">
        <ThemeDisplay />
      </ThemeProvider>,
    )
    const resolved = screen.getByTestId('resolved').textContent
    expect(['dark', 'light']).toContain(resolved)
  })
})
