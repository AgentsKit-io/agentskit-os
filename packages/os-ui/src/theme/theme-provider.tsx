import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  applyThemeToDocument,
  buildThemeRegistry,
  defaultThemes,
} from './theme-registry'
import type { ThemeRegistry } from './theme-registry'

export type Theme = 'dark' | 'light' | 'cyber' | 'system'

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark' | 'light' | 'cyber'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  /** Optional additional theme definitions to merge into the registry. */
  themes?: ThemeRegistry
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  themes,
}: ThemeProviderProps): React.JSX.Element {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  const registry = useMemo(
    () => buildThemeRegistry(themes),
    [themes],
  )

  const resolveSystemTheme = useCallback((): 'dark' | 'light' => {
    if (typeof window === 'undefined') return 'dark'
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    return 'light'
  }, [])

  let resolvedTheme: 'dark' | 'light' | 'cyber'
  if (theme === 'system') resolvedTheme = resolveSystemTheme()
  else resolvedTheme = theme

  useEffect(() => {
    if (typeof document === 'undefined') return
    const themeDefinition =
      registry[resolvedTheme] ?? defaultThemes[resolvedTheme] ?? { name: resolvedTheme }
    applyThemeToDocument(themeDefinition)
  }, [resolvedTheme, registry])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
