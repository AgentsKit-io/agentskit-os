/**
 * useShortcutHandler — register a keyboard-shortcut handler by id.
 *
 * The handler is automatically deregistered when the component unmounts or
 * when `id` / `fn` change (stable refs recommended via useCallback).
 *
 * Example:
 *   useShortcutHandler('palette.toggle', () => openPalette())
 */

import { useEffect } from 'react'
import { _registerHandler } from './shortcut-provider'

/**
 * Register a handler function for the shortcut with the given `id`.
 * The handler fires when the effective key binding for that shortcut is pressed.
 */
export function useShortcutHandler(id: string, fn: (event: KeyboardEvent) => void): void {
  useEffect(() => {
    const unregister = _registerHandler(id, fn)
    return unregister
  }, [id, fn])
}
