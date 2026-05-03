// Package metadata
export const PACKAGE_NAME = '@agentskit/os-ui' as const
export const PACKAGE_VERSION = '0.0.0' as const

// Utility
export { cn } from './lib/cn'

// Theme
export { ThemeProvider, useTheme } from './theme/theme-provider'
export type { Theme, ThemeContextValue, ThemeProviderProps } from './theme/theme-provider'

export {
  defaultThemes,
  buildThemeRegistry,
  applyThemeToDocument,
  clearThemeOverrides,
  ThemeDefinitionSchema,
  ThemeRegistrySchema,
} from './theme/theme-registry'
export type { ThemeDefinition, ThemeRegistry } from './theme/theme-registry'

// Components
export { Button, buttonVariants } from './components/button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/button'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/card'

export { Badge, badgeVariants } from './components/badge'
export type { BadgeProps, BadgeVariant } from './components/badge'

export { Kbd } from './components/kbd'
export type { KbdProps } from './components/kbd'

export { Tooltip } from './components/tooltip'
export type { TooltipProps, TooltipTriggerProps } from './components/tooltip'

export { GlassPanel } from './components/glass-panel'
export type { GlassPanelProps } from './components/glass-panel'

export { ThemeSwitcher } from './components/theme-switcher'
export type { ThemeSwitcherProps } from './components/theme-switcher'
