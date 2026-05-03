/**
 * preferences-types — Zod schema + TypeScript types for user preferences.
 *
 * Fields:
 *   density        — UI element spacing: compact | comfortable
 *   fontSize       — base font size scale: sm | md | lg
 *   language       — interface locale: en | es | pt | fr | de | ja
 *   reducedMotion  — disable animations
 *   highContrast   — apply high-contrast colour overrides
 *   telemetryOptIn — opt in to anonymous telemetry
 */

import { z } from 'zod'

export const DensitySchema = z.enum(['compact', 'comfortable'])
export type Density = z.infer<typeof DensitySchema>

export const FontSizeSchema = z.enum(['sm', 'md', 'lg'])
export type FontSize = z.infer<typeof FontSizeSchema>

export const LanguageSchema = z.enum(['en', 'es', 'pt', 'fr', 'de', 'ja'])
export type Language = z.infer<typeof LanguageSchema>

export const PreferencesSchema = z.object({
  density: DensitySchema.default('comfortable'),
  fontSize: FontSizeSchema.default('md'),
  language: LanguageSchema.default('en'),
  reducedMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  telemetryOptIn: z.boolean().default(false),
})

export type Preferences = z.infer<typeof PreferencesSchema>

export const DEFAULT_PREFERENCES: Preferences = PreferencesSchema.parse({})
