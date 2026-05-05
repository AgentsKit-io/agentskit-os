import type { FlowDefinition } from './use-flows'

export function FlowCanvasPreview({ flow }: { readonly flow: FlowDefinition }) {
  return (
    <div className="rounded-2xl border border-[var(--ag-line)] bg-[var(--ag-panel)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ag-ink)]">Flow topology</h3>
        <span className="font-mono text-xs text-[var(--ag-ink-subtle)]">{flow.version}</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2 pb-1">
          {flow.nodes.map((node, index) => (
            <div key={node} className="flex items-center gap-2">
              <div className="rounded-xl border border-[var(--ag-line)] bg-[var(--ag-surface)] px-3 py-2">
                <div className="font-mono text-xs text-[var(--ag-ink)]">{node}</div>
              </div>
              {index < flow.nodes.length - 1 && (
                <div aria-hidden className="h-px w-8 bg-[var(--ag-line)]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

