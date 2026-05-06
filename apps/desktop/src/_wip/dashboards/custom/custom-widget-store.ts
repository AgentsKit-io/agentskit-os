/**
 * Custom widget store — CRUD operations over localStorage.
 *
 * Storage key: "agentskitos.custom-widgets"
 * Format: JSON array of CustomWidget objects validated through Zod.
 *
 * All functions are pure (no React hooks) so they can be called from both
 * React components and non-React contexts (e.g. CLI, tests).
 */

import { z } from 'zod'
import { CustomWidgetSchema } from './custom-widget-types'
import type { CustomWidget } from './custom-widget-types'

const STORAGE_KEY = 'agentskitos.custom-widgets'

const StorageSchema = z.array(CustomWidgetSchema)

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function loadCustomWidgets(): CustomWidget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    const result = StorageSchema.safeParse(parsed)
    return result.success ? result.data : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

function saveAll(widgets: CustomWidget[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function saveCustomWidget(widget: CustomWidget): void {
  const existing = loadCustomWidgets()
  const idx = existing.findIndex((w) => w.id === widget.id)
  if (idx >= 0) {
    existing[idx] = widget
  } else {
    existing.push(widget)
  }
  saveAll(existing)
}

export function deleteCustomWidget(id: string): void {
  const existing = loadCustomWidgets()
  saveAll(existing.filter((w) => w.id !== id))
}

export function getCustomWidget(id: string): CustomWidget | undefined {
  return loadCustomWidgets().find((w) => w.id === id)
}

// ---------------------------------------------------------------------------
// JSON export / import
// ---------------------------------------------------------------------------

export function exportCustomWidgetsJson(): string {
  return JSON.stringify(loadCustomWidgets(), null, 2)
}

export function importCustomWidgetsJson(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as unknown
    const result = StorageSchema.safeParse(parsed)
    if (!result.success) return false
    saveAll(result.data)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

export function makeCustomWidgetId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
