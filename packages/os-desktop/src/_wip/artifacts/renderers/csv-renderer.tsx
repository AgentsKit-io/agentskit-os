/**
 * CsvRenderer — tabular display with pagination (100 rows per page).
 */

import { useMemo, useState } from 'react'

export type CsvRendererProps = {
  readonly content: string
}

const PAGE_SIZE = 100

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return { headers: [], rows: [] }

  // Detect delimiter (comma or tab)
  const firstLine = lines[0]!
  const delim = firstLine.includes('\t') ? '\t' : ','

  const parsed = lines.map((l) => l.split(delim).map((cell) => cell.trim()))
  const headers = parsed[0] ?? []
  const rows = parsed.slice(1)

  return { headers, rows }
}

export function CsvRenderer({ content }: CsvRendererProps): React.JSX.Element {
  const [page, setPage] = useState(0)

  const { headers, rows } = useMemo(() => parseCSV(content), [content])

  if (headers.length === 0) {
    return (
      <div className="rounded-md border border-[var(--ag-line)] p-3 text-sm text-[var(--ag-ink-muted)]">
        No CSV data to display.
      </div>
    )
  }

  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-auto rounded-md border border-[var(--ag-line)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--ag-line)] bg-[var(--ag-surface-alt)]">
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-3 py-2 text-left font-medium text-[var(--ag-ink)] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b border-[var(--ag-line)] last:border-0 hover:bg-[var(--ag-panel-alt)]/50"
              >
                {headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-[var(--ag-ink-muted)]">
                    {row[ci] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--ag-ink-muted)]">
          <span>
            Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of{' '}
            {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="rounded px-2 py-1 hover:bg-[var(--ag-panel-alt)] disabled:opacity-40"
            >
              ‹ Prev
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              aria-label="Next page"
              className="rounded px-2 py-1 hover:bg-[var(--ag-panel-alt)] disabled:opacity-40"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
