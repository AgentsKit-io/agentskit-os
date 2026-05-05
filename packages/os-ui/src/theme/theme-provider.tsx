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

export type ThemeProviderProps =
  | { children: React.ReactNode }
  | { children: React.ReactNode; defaultTheme: Theme | undefined }
  | { children: React.ReactNode; themes: ThemeRegistry | undefined }
  | { children: React.ReactNode; defaultTheme: Theme | undefined; themes: ThemeRegistry | undefined }

export function ThemeProvider(props: ThemeProviderProps): React.JSX.Element {
  const children = props.children
  let defaultTheme: Theme = 'dark'
  if ('defaultTheme' in props && props.defaultTheme !== undefined) defaultTheme = props.defaultTheme
  const themes = 'themes' in props ? props.themes : undefined
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
    let themeDefinition = registry[resolvedTheme]
    if (themeDefinition === undefined) themeDefinition = defaultThemes[resolvedTheme]
    if (themeDefinition === undefined) themeDefinition = { name: resolvedTheme }
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
