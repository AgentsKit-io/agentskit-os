import { z } from 'zod'

/**
 * Zod schema for a single theme definition.
 *
 * A theme has a name and an optional map of CSS variable overrides.
 * The `cssVars` record keys must be valid CSS custom property names
 * (starting with --).
 */
export const ThemeDefinitionSchema = z.object({
  /** Unique theme identifier — used as the `data-theme` attribute value. */
  name: z.string().min(1),
  /** Optional CSS variable overrides applied to `document.documentElement`. */
  cssVars: z.record(z.string().startsWith('--'), z.string()).optional(),
})

export type ThemeDefinition = z.infer<typeof ThemeDefinitionSchema>

/**
 * A registry is a record of theme name → ThemeDefinition.
 */
export const ThemeRegistrySchema = z.record(z.string(), ThemeDefinitionSchema)

export type ThemeRegistry = z.infer<typeof ThemeRegistrySchema>

/**
 * Built-in themes shipped with os-ui.
 *
 * - `dark`  : Default dark cyan palette (defined in tokens.css).
 * - `light` : Basic light mode (defined in tokens.css).
 * - `cyber` : Cyber-minimal — dark base + neon cyan/magenta (tokens-cyber.css).
 */
export const defaultThemes: ThemeRegistry = {
  dark: { name: 'dark' },
  light: { name: 'light' },
  cyber: { name: 'cyber' },
}

/**
 * Apply a theme to `document.documentElement`.
 *
 * Sets the `data-theme` attribute and then applies any CSS variable
 * overrides from `theme.cssVars` directly on `documentElement.style`.
 * Previously applied overrides from the *same registry* are not removed
 * automatically — callers should call `clearThemeOverrides` first if needed.
 */
export function applyThemeToDocument(theme: ThemeDefinition): void {
  if (typeof document === 'undefined') return

  document.documentElement.setAttribute('data-theme', theme.name)

  if (theme.cssVars) {
    for (const [prop, value] of Object.entries(theme.cssVars)) {
      document.documentElement.style.setProperty(prop, value)
    }
  }
}

/**
 * Remove all inline CSS variable overrides that were set by
 * `applyThemeToDocument`.  Pass the list of variable names to clear.
 */
export function clearThemeOverrides(varNames: string[]): void {
  if (typeof document === 'undefined') return
  for (const prop of varNames) {
    document.documentElement.style.removeProperty(prop)
  }
}

/**
 * Merge external theme definitions into the default registry.
 *
 * Unknown or invalid entries are silently skipped after Zod validation.
 */
export function buildThemeRegistry(
  extra?: ThemeRegistry,
): ThemeRegistry {
  if (!extra) return defaultThemes
  const result = { ...defaultThemes }
  for (const [key, raw] of Object.entries(extra)) {
    const parsed = ThemeDefinitionSchema.safeParse(raw)
    if (parsed.success) {
      result[key] = parsed.data
    }
  }
  return result
}
