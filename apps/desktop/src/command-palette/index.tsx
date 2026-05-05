/**
 * CommandPalette — system-wide overlay component.
 *
 * Renders nothing unless open (controlled by CommandPaletteProvider via context).
 * Layout: fixed backdrop + centered GlassPanel modal capped at 640px, top ~20vh.
 */

import { useCallback, useEffect, useState } from 'react'
import { GlassPanel } from '@agentskit/os-ui'
import { useCommandPalette } from './command-palette-provider'
import { PaletteInput } from './palette-input'
import { PaletteList } from './palette-list'
import { useCommandSearch } from './use-command-search'
import type { Command, CommandCategory } from './commands'
import { ShortcutHints } from '../components/shortcut-hints'

export function CommandPalette() {
  const { open, closePalette, commands } = useCommandPalette()

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<CommandCategory | 'All'>('All')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter by category first, then fuzzy search
  const categoryFiltered =
    activeCategory === 'All'
      ? commands
      : commands.filter((c) => c.category === activeCategory)

  const results = useCommandSearch(query, categoryFiltered)

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length, query])

  // Reset state when palette closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveCategory('All')
      setSelectedIndex(0)
    }
  }, [open])

  const handleRun = useCallback(
    (cmd: Command) => {
      cmd.run()
      closePalette()
    },
    [closePalette],
  )

  if (!open) return null

  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac')
  const shortcutHint = isMac ? '⌘K' : 'Ctrl+K'

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3"
      style={{ paddingTop: 'min(20vh, 7rem)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closePalette()
      }}
    >
      <GlassPanel
        blur="lg"
        className="w-full max-w-[640px] overflow-hidden bg-[var(--ag-glass-strong-bg)] shadow-2xl"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <span className="text-[11px] font-medium text-[var(--ag-ink-subtle)]">
            Command Palette
          </span>
          <ShortcutHints shortcutHint={shortcutHint} enterVerb="run" />
        </div>

        <PaletteInput
          query={query}
          onQueryChange={setQuery}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <PaletteList
          commands={results}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          onRun={handleRun}
          onClose={closePalette}
        />
      </GlassPanel>
    </div>
  )
}
