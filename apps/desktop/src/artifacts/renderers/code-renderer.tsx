/**
 * CodeRenderer — preformatted code block with line numbers and copy button.
 */

import { useCallback, useState } from 'react'

export type CodeRendererProps = {
  readonly content: string
  /** Optional language hint for the code block label */
  readonly language?: string
}

export function CodeRenderer({ content, language }: CodeRendererProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [content])

  const lines = content.split('\n')

  return (
    <div className="relative overflow-hidden rounded-md border border-[var(--ag-line)] bg-[var(--ag-surface-alt)] font-mono text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--ag-line)] px-3 py-1.5">
        <span className="text-[11px] text-[var(--ag-ink-subtle)] uppercase tracking-widest">
          {language ?? 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
          className="rounded px-2 py-0.5 text-[11px] text-[var(--ag-ink-muted)] transition-colors hover:bg-[var(--ag-panel-alt)] hover:text-[var(--ag-ink)]"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code body with line numbers */}
      <div className="overflow-auto p-0">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="group">
                <td
                  aria-hidden
                  className="select-none border-r border-[var(--ag-line)] px-3 py-0 text-right text-[var(--ag-ink-subtle)] tabular-nums"
                  style={{ minWidth: '2.5rem', userSelect: 'none' }}
                >
                  {i + 1}
                </td>
                <td className="px-4 py-0 text-[var(--ag-ink)] whitespace-pre">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
