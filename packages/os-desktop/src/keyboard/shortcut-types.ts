/**
 * Keyboard shortcut type definitions and pure utility helpers.
 *
 * A `Binding` is a `+`-separated string of modifiers and a key, e.g.
 * `"meta+shift+k"`, `"ctrl+alt+d"`, `"alt+f4"`.
 *
 * Canonical modifier order: meta → ctrl → alt → shift → key.
 * Key is always lower-case (printable char) or a named key (Escape, Enter, …).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A canonical binding string, e.g. `"meta+k"` or `"ctrl+shift+t"`. */
export type Binding = string

export type ShortcutCategory =
  | 'Navigation'
  | 'View'
  | 'Runtime'
  | 'System'
  | 'Help'

export type Shortcut = {
  /** Stable unique identifier, e.g. `"palette.toggle"`. */
  readonly id: string
  /** Human-readable label, e.g. `"Toggle Command Palette"`. */
  readonly label: string
  /** Default key binding. */
  readonly defaultBinding: Binding
  /** Short description shown in the shortcuts panel. */
  readonly description: string
  readonly category: ShortcutCategory
}

// ---------------------------------------------------------------------------
// parseBinding
// ---------------------------------------------------------------------------

/**
 * Parse a canonical binding string into its components.
 *
 * @returns An object with boolean modifier flags and the normalised key.
 */
export function parseBinding(binding: Binding): {
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  key: string
} {
  const parts = binding.toLowerCase().split('+')
  const key = parts[parts.length - 1] ?? ''
  return {
    meta: parts.includes('meta'),
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    key,
  }
}

// ---------------------------------------------------------------------------
// matchesBinding
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the given `KeyboardEvent` matches the canonical binding.
 *
 * Named-key normalisation handled:
 *   - `Escape` → `"escape"`
 *   - `Enter`  → `"enter"`
 *   - `ArrowUp` etc. → `"arrowup"` etc.
 *   - Single printable char keys are lowercased.
 */
export function matchesBinding(event: KeyboardEvent, binding: Binding): boolean {
  const parsed = parseBinding(binding)
  if (event.metaKey !== parsed.meta) return false
  if (event.ctrlKey !== parsed.ctrl) return false
  if (event.altKey !== parsed.alt) return false
  if (event.shiftKey !== parsed.shift) return false
  return event.key.toLowerCase() === parsed.key
}

// ---------------------------------------------------------------------------
// formatBinding
// ---------------------------------------------------------------------------

/** Platform-aware symbols for modifier display. */
const MOD_SYMBOLS = {
  meta: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
} as const

/**
 * Format a canonical binding string for human display.
 *
 * e.g. `"meta+shift+k"` → `"⌘⇧K"` on macOS.
 */
export function formatBinding(binding: Binding): string {
  const { meta, ctrl, alt, shift, key } = parseBinding(binding)
  let out = ''
  if (meta) out += MOD_SYMBOLS.meta
  if (ctrl) out += MOD_SYMBOLS.ctrl
  if (alt) out += MOD_SYMBOLS.alt
  if (shift) out += MOD_SYMBOLS.shift
  // Capitalise single-char keys; keep named keys title-cased.
  out += key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1)
  return out
}

// ---------------------------------------------------------------------------
// buildBinding
// ---------------------------------------------------------------------------

/**
 * Construct a canonical binding string from a `KeyboardEvent`.
 * Used when recording a new binding in the shortcuts panel.
 */
export function buildBindingFromEvent(event: KeyboardEvent): Binding {
  const parts: string[] = []
  if (event.metaKey) parts.push('meta')
  if (event.ctrlKey) parts.push('ctrl')
  if (event.altKey) parts.push('alt')
  if (event.shiftKey) parts.push('shift')
  const rawKey = event.key
  // Ignore lone modifier key presses
  const isModifierOnly = ['Meta', 'Control', 'Alt', 'Shift'].includes(rawKey)
  if (!isModifierOnly) {
    parts.push(rawKey.toLowerCase())
  }
  return parts.join('+')
}
