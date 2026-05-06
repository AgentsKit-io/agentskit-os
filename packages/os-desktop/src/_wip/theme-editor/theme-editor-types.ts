/**
 * theme-editor-types — Zod schemas and constants for the theme editor.
 *
 * M2 / Issue #231 — Theme editor with live preview + marketplace stub.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/**
 * A map of CSS custom property name (--ag-xxx) to a CSS value string.
 * Only --ag-* prefixed vars are accepted in the editor; arbitrary values
 * are stored as-is and validated at the boundary.
 */
export const ThemeOverrideSchema = z.record(
  z.string().startsWith('--'),
  z.string(),
)

export type ThemeOverride = z.infer<typeof ThemeOverrideSchema>

/** Base themes that can be used as starting points for custom themes. */
export const BaseThemeSchema = z.enum(['dark', 'cyber', 'light'])
export type BaseTheme = z.infer<typeof BaseThemeSchema>

/** A user-created custom theme persisted to localStorage. */
export const CustomThemeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  base: BaseThemeSchema,
  overrides: ThemeOverrideSchema,
})

export type CustomTheme = z.infer<typeof CustomThemeSchema>

// ---------------------------------------------------------------------------
// Editable token definitions
// ---------------------------------------------------------------------------

export type TokenKind = 'color' | 'text'

export interface EditableToken {
  /** CSS custom property name, e.g. --ag-surface */
  readonly varName: string
  /** Human-readable label shown in the editor UI */
  readonly label: string
  /** Whether this token should use a color picker or a text input */
  readonly kind: TokenKind
  /** Section grouping label */
  readonly section: TokenSection
}

export type TokenSection = 'Surfaces' | 'Ink' | 'Accent' | 'Lines'

/**
 * Ordered list of design tokens the theme editor exposes for editing.
 * Matches the --ag-* CSS variables defined in tokens.css and tokens-cyber.css.
 */
export const EDITABLE_TOKENS: ReadonlyArray<EditableToken> = [
  // Surfaces
  { varName: '--ag-surface', label: 'Surface', kind: 'color', section: 'Surfaces' },
  { varName: '--ag-surface-alt', label: 'Surface Alt', kind: 'color', section: 'Surfaces' },
  { varName: '--ag-surface-dim', label: 'Surface Dim', kind: 'color', section: 'Surfaces' },
  { varName: '--ag-panel', label: 'Panel', kind: 'color', section: 'Surfaces' },
  { varName: '--ag-panel-alt', label: 'Panel Alt', kind: 'color', section: 'Surfaces' },
  // Lines
  { varName: '--ag-line', label: 'Line', kind: 'color', section: 'Lines' },
  { varName: '--ag-line-soft', label: 'Line Soft', kind: 'color', section: 'Lines' },
  // Ink
  { varName: '--ag-ink', label: 'Ink', kind: 'color', section: 'Ink' },
  { varName: '--ag-ink-muted', label: 'Ink Muted', kind: 'color', section: 'Ink' },
  { varName: '--ag-ink-subtle', label: 'Ink Subtle', kind: 'color', section: 'Ink' },
  // Accent
  { varName: '--ag-accent', label: 'Accent', kind: 'color', section: 'Accent' },
  { varName: '--ag-accent-hover', label: 'Accent Hover', kind: 'color', section: 'Accent' },
  { varName: '--ag-accent-dim', label: 'Accent Dim', kind: 'color', section: 'Accent' },
] as const

/** Map of section → tokens, preserving display order. */
export const TOKEN_SECTIONS: ReadonlyArray<TokenSection> = ['Surfaces', 'Lines', 'Ink', 'Accent']

/** Returns tokens for a given section. */
export function getTokensBySection(section: TokenSection): ReadonlyArray<EditableToken> {
  return EDITABLE_TOKENS.filter((t) => t.section === section)
}
