import { render, screen, act } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { ThemeProvider, useTheme } from '../src/theme/theme-provider'
import { ThemeSwitcher } from '../src/components/theme-switcher'

/** Helper to read the active theme from context. */
function ThemeDisplay(): React.JSX.Element {
  const { theme } = useTheme()
  return <span data-testid="current-theme">{theme}</span>
}

function Wrapper({ defaultTheme = 'dark' }: { defaultTheme?: string }) {
  return (
    <ThemeProvider defaultTheme={defaultTheme as 'dark' | 'light' | 'cyber' | 'system'}>
      <ThemeDisplay />
      <ThemeSwitcher />
    </ThemeProvider>
  )
}

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders buttons for dark, cyber, light, and system', () => {
    render(<Wrapper />)
    expect(screen.getByRole('button', { name: /dark theme/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /cyber theme/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /light theme/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /system theme/i })).toBeTruthy()
  })

  it('marks the active theme button as pressed', () => {
    render(<Wrapper defaultTheme="dark" />)
    const darkBtn = screen.getByRole('button', { name: /dark theme/i })
    expect(darkBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('switches to cyber theme when the cyber button is clicked', async () => {
    render(<Wrapper defaultTheme="dark" />)
    await act(async () => {
      screen.getByRole('button', { name: /cyber theme/i }).click()
    })
    expect(screen.getByTestId('current-theme').textContent).toBe('cyber')
    expect(document.documentElement.getAttribute('data-theme')).toBe('cyber')
  })

  it('switches to light theme when the light button is clicked', async () => {
    render(<Wrapper defaultTheme="dark" />)
    await act(async () => {
      screen.getByRole('button', { name: /light theme/i }).click()
    })
    expect(screen.getByTestId('current-theme').textContent).toBe('light')
  })

  it('switches to system theme when the system button is clicked', async () => {
    render(<Wrapper defaultTheme="dark" />)
    await act(async () => {
      screen.getByRole('button', { name: /system theme/i }).click()
    })
    expect(screen.getByTestId('current-theme').textContent).toBe('system')
  })

  it('has a group role with an accessible label', () => {
    render(<Wrapper />)
    expect(
      screen.getByRole('group', { name: /select color theme/i }),
    ).toBeTruthy()
  })

  it('updates aria-pressed when theme changes', async () => {
    render(<Wrapper defaultTheme="dark" />)
    const cyberBtn = screen.getByRole('button', { name: /cyber theme/i })
    expect(cyberBtn.getAttribute('aria-pressed')).toBe('false')
    await act(async () => {
      cyberBtn.click()
    })
    expect(cyberBtn.getAttribute('aria-pressed')).toBe('true')
  })
})
