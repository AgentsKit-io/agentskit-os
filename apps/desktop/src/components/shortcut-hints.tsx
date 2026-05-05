import { Kbd } from '@agentskit/os-ui'

export type ShortcutHintsProps = {
  readonly shortcutHint: string
  readonly enterVerb: 'open' | 'run'
}

export function ShortcutHints({ shortcutHint, enterVerb }: ShortcutHintsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 text-[11px] text-[var(--ag-ink-subtle)]">
      <Kbd>{shortcutHint}</Kbd>
      <span>to toggle</span>
      <span className="mx-1">·</span>
      <Kbd>↑↓</Kbd>
      <span>navigate</span>
      <span className="mx-1">·</span>
      <Kbd>↵</Kbd>
      <span>{enterVerb}</span>
      <span className="mx-1">·</span>
      <Kbd>Esc</Kbd>
      <span>close</span>
    </div>
  )
}

