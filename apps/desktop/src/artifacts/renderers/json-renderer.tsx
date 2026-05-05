/**
 * JsonRenderer — pretty-printed JSON with collapsible top-level keys.
 */

import { useState, useCallback } from 'react'

export type JsonRendererProps = {
  readonly content: string
}

type ParsedJson = Record<string, unknown> | unknown[]

function tryParse(content: string): ParsedJson | null {
  try {
    const parsed: unknown = JSON.parse(content)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as ParsedJson
    }
    return null
  } catch {
    return null
  }
}

type CollapsibleKeyProps = {
  readonly keyName: string
  readonly value: unknown
}

function CollapsibleKey({ keyName, value }: CollapsibleKeyProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const isComplex = typeof value === 'object' && value !== null
  const preview = isComplex
    ? Array.isArray(value)
      ? `[${(value as unknown[]).length} items]`
      : `{${Object.keys(value as Record<string, unknown>).length} keys}`
    : null

  const handleToggle = useCallback(() => {
    if (isComplex) setCollapsed((p) => !p)
  }, [isComplex])

  return (
    <div className="mb-1">
      <div className="flex items-start gap-1">
        {isComplex && (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${keyName}`}
            className="mt-0.5 shrink-0 text-[10px] text-[var(--ag-ink-subtle)] hover:text-[var(--ag-ink)]"
          >
            {collapsed ? '▶' : '▼'}
          </button>
        )}
        {!isComplex && <span className="w-3 shrink-0" />}
        <span className="text-[var(--ag-accent)] shrink-0">{JSON.stringify(keyName)}</span>
        <span className="text-[var(--ag-ink-muted)] shrink-0">:</span>
        {collapsed && preview !== null && (
          <span className="text-[var(--ag-ink-subtle)] italic ml-1">{preview}</span>
        )}
        {!collapsed && (
          <pre className="text-[var(--ag-ink)] whitespace-pre-wrap break-all ml-1">
            {JSON.stringify(value, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export function JsonRenderer({ content }: JsonRendererProps): React.JSX.Element {
  const parsed = tryParse(content)

  if (parsed === null) {
    return (
      <div className="rounded-md border border-[var(--ag-danger)]/25 bg-[var(--ag-danger)]/10 p-3 text-xs text-[var(--ag-danger)]">
        Invalid JSON — could not parse content.
      </div>
    )
  }

  if (Array.isArray(parsed)) {
    return (
      <div className="overflow-auto rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] p-3 font-mono text-xs">
        <pre className="text-[var(--ag-ink)] whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </div>
    )
  }

  const keys = Object.keys(parsed as Record<string, unknown>)

  return (
    <div className="overflow-auto rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] p-3 font-mono text-xs">
      {keys.map((k) => (
        <CollapsibleKey
          key={k}
          keyName={k}
          value={(parsed as Record<string, unknown>)[k]}
        />
      ))}
    </div>
  )
}
