/**
 * PaletteList — renders grouped command results with keyboard navigation.
 *
 * Keyboard: ↑/↓ moves selection, Enter runs, Esc closes (handled by parent).
 * Results are capped at 25 by `searchCommands`.
 */

import { useEffect } from 'react'
import {
  LayoutDashboard,
  GitBranch,
  Settings,
  Pause,
  Play,
  Sun,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import type { Command, CommandCategory } from './commands'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  GitBranch,
  Settings,
  Pause,
  Play,
  Sun,
  Trash2,
}

const CATEGORY_ORDER: CommandCategory[] = ['Navigation', 'Runtime', 'View', 'System']

type PaletteListProps = {
  commands: Command[]
  selectedIndex: number
  onSelectIndex: (i: number) => void
  onRun: (command: Command) => void
  onClose: () => void
}

export function PaletteList({
  commands,
  selectedIndex,
  onSelectIndex,
  onRun,
  onClose,
}: PaletteListProps) {
  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        onSelectIndex(Math.min(selectedIndex + 1, commands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        onSelectIndex(Math.max(selectedIndex - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = commands[selectedIndex]
        if (cmd) onRun(cmd)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commands, selectedIndex, onSelectIndex, onRun, onClose])

  if (commands.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--ag-ink-muted)]">
        No commands found
      </div>
    )
  }

  // Group by category, preserving the order within each group
  const grouped = new Map<CommandCategory, Command[]>()
  for (const cmd of commands) {
    const group = grouped.get(cmd.category) ?? []
    group.push(cmd)
    grouped.set(cmd.category, group)
  }

  // Build a flat ordered list of commands (for index mapping)
  const flatOrdered: Command[] = []
  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c))
  for (const cat of orderedCategories) {
    flatOrdered.push(...(grouped.get(cat) ?? []))
  }

  let globalIndex = 0

  return (
    <ul role="listbox" className="overflow-y-auto max-h-[340px] py-1">
      {orderedCategories.map((cat) => {
        const items = grouped.get(cat) ?? []
        return (
          <li key={cat}>
            {/* Category header */}
            <div
              role="presentation"
              className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--ag-ink-subtle)]"
            >
              {cat}
            </div>
            <ul>
              {items.map((cmd) => {
                const index = flatOrdered.indexOf(cmd)
                const isSelected = index === selectedIndex
                const Icon = cmd.icon ? ICON_MAP[cmd.icon] : undefined
                globalIndex++
                return (
                  <li
                    key={cmd.id}
                    role="option"
                    aria-selected={isSelected}
                    data-selected={isSelected}
                    onMouseEnter={() => onSelectIndex(index)}
                    onClick={() => onRun(cmd)}
                    className={[
                      'flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors',
                      isSelected
                        ? 'bg-[var(--ag-accent-dim)] text-[var(--ag-ink)]'
                        : 'text-[var(--ag-ink-muted)] hover:text-[var(--ag-ink)]',
                    ].join(' ')}
                  >
                    {Icon && (
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 ${
                          isSelected ? 'text-[var(--ag-accent)]' : 'text-[var(--ag-ink-subtle)]'
                        }`}
                        aria-hidden
                      />
                    )}
                    <span className="flex-1 truncate">{cmd.label}</span>
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}
