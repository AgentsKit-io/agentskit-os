/**
 * theme-editor-store — CRUD helpers for custom themes in localStorage.
 *
 * Storage key: agentskitos.custom-themes
 * Value: JSON array of CustomTheme.
 *
 * M2 / Issue #231 — Theme editor with live preview + marketplace stub.
 */

import { CustomThemeSchema, type CustomTheme } from './theme-editor-types'
import { z } from 'zod'

const STORAGE_KEY = 'agentskitos.custom-themes'

const CustomThemeArraySchema = z.array(CustomThemeSchema)

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Load all custom themes from localStorage. Returns [] on any parse failure. */
export function loadCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = CustomThemeArraySchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

function saveCustomThemes(themes: CustomTheme[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes))
}

/** Add a new custom theme. Throws if a theme with the same id already exists. */
export function addCustomTheme(theme: CustomTheme): CustomTheme[] {
  const existing = loadCustomThemes()
  if (existing.some((t) => t.id === theme.id)) {
    throw new Error(`A theme with id "${theme.id}" already exists.`)
  }
  const validated = CustomThemeSchema.parse(theme)
  const next = [...existing, validated]
  saveCustomThemes(next)
  return next
}

/** Update an existing theme by id. Returns null if not found. */
export function updateCustomTheme(
  id: string,
  patch: Partial<Omit<CustomTheme, 'id'>>,
): CustomTheme[] | null {
  const existing = loadCustomThemes()
  const idx = existing.findIndex((t) => t.id === id)
  if (idx === -1) return null
  const updated = CustomThemeSchema.parse({ ...existing[idx], ...patch, id })
  const next = [...existing.slice(0, idx), updated, ...existing.slice(idx + 1)]
  saveCustomThemes(next)
  return next
}

/** Remove a theme by id. Returns the resulting list (unchanged if not found). */
export function removeCustomTheme(id: string): CustomTheme[] {
  const existing = loadCustomThemes()
  const next = existing.filter((t) => t.id !== id)
  saveCustomThemes(next)
  return next
}

/** Upsert: update if id exists, else add. */
export function upsertCustomTheme(theme: CustomTheme): CustomTheme[] {
  const existing = loadCustomThemes()
  const idx = existing.findIndex((t) => t.id === theme.id)
  const validated = CustomThemeSchema.parse(theme)
  let next: CustomTheme[]
  if (idx === -1) {
    next = [...existing, validated]
  } else {
    next = [...existing.slice(0, idx), validated, ...existing.slice(idx + 1)]
  }
  saveCustomThemes(next)
  return next
}

// ---------------------------------------------------------------------------
// JSON import / export
// ---------------------------------------------------------------------------

/** Serialize a single CustomTheme to a JSON string (pretty-printed). */
export function exportThemeJson(theme: CustomTheme): string {
  return JSON.stringify(theme, null, 2)
}

/**
 * Parse a JSON string into a CustomTheme.
 * Throws a ZodError (or SyntaxError) on failure.
 */
export function importThemeJson(json: string): CustomTheme {
  return CustomThemeSchema.parse(JSON.parse(json))
}

/** Generate a collision-resistant id for a new custom theme. */
export function generateThemeId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `custom-${slug}-${Date.now()}`
}
