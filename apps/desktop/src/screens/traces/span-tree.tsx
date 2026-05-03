/**
 * SpanTree — recursive span hierarchy renderer.
 *
 * Renders spans as an indented tree with:
 * - Indent rail lines for visual hierarchy
 * - Span name + kind badge
 * - Duration bar (proportional flame fragment)
 * - gen_ai.* attributes when present
 */

import type { Span, SpanStatus } from './use-traces'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpanNode = {
  readonly span: Span
  readonly children: readonly SpanNode[]
}

export type SpanTreeProps = {
  readonly spans: readonly Span[]
  readonly className?: string
}

// ---------------------------------------------------------------------------
// Build tree from flat list
// ---------------------------------------------------------------------------

export const buildSpanTree = (spans: readonly Span[]): readonly SpanNode[] => {
  const nodeMap = new Map<string, SpanNode>()
  const mutableChildren = new Map<string, SpanNode[]>()

  // Build a mutable children map first
  for (const span of spans) {
    mutableChildren.set(span.spanId, [])
  }

  for (const span of spans) {
    const node: SpanNode = { span, children: [] }
    nodeMap.set(span.spanId, node)
  }

  // Link children — we need a mutable list to build, then freeze
  const childLists = new Map<string, SpanNode[]>()
  for (const span of spans) {
    childLists.set(span.spanId, [])
  }

  for (const span of spans) {
    if (span.parentSpanId !== undefined) {
      const list = childLists.get(span.parentSpanId)
      const node = nodeMap.get(span.spanId)
      if (list !== undefined && node !== undefined) {
        list.push(node)
      }
    }
  }

  // Rebuild nodes with correct children
  const finalNodes = new Map<string, SpanNode>()
  for (const span of spans) {
    const children = childLists.get(span.spanId) ?? []
    finalNodes.set(span.spanId, { span, children })
  }

  // Rebuild children lists to point at final nodes
  const rebuildChildren = (spanId: string): SpanNode => {
    const existing = finalNodes.get(spanId)
    if (existing === undefined) throw new Error(`Span ${spanId} not found`)
    const children = (childLists.get(spanId) ?? []).map((c) =>
      rebuildChildren(c.span.spanId),
    )
    return { span: existing.span, children }
  }

  // Return only root spans (no parent or parent not in spans)
  const spanIds = new Set(spans.map((s) => s.spanId))
  const roots = spans.filter(
    (s) => s.parentSpanId === undefined || !spanIds.has(s.parentSpanId),
  )

  return roots.map((s) => rebuildChildren(s.spanId))
}

// ---------------------------------------------------------------------------
// Duration calculations
// ---------------------------------------------------------------------------

const totalDurationMs = (spans: readonly Span[]): number => {
  if (spans.length === 0) return 1
  const max = Math.max(...spans.map((s) => s.durationMs))
  return max > 0 ? max : 1
}

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<SpanStatus, string> = {
  ok: 'text-emerald-400',
  error: 'text-red-400',
  skipped: 'text-zinc-400',
  paused: 'text-amber-400',
}

const STATUS_BADGE_COLORS: Record<SpanStatus, string> = {
  ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  error: 'bg-red-500/15 text-red-400 border-red-500/25',
  skipped: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

const KIND_BADGE_COLORS: Record<string, string> = {
  flow: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  agent: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  tool: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  human: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  unknown: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}

// ---------------------------------------------------------------------------
// GenAI attributes rendering
// ---------------------------------------------------------------------------

const GEN_AI_DISPLAY_KEYS: readonly string[] = [
  'gen_ai.system',
  'gen_ai.request.model',
  'gen_ai.response.model',
  'gen_ai.usage.input_tokens',
  'gen_ai.usage.output_tokens',
  'gen_ai.operation.name',
  'gen_ai.response.finish_reasons',
]

type GenAiAttrsProps = {
  readonly attributes: Record<string, unknown>
}

const GenAiAttrs = ({ attributes }: GenAiAttrsProps): React.JSX.Element | null => {
  const relevant = GEN_AI_DISPLAY_KEYS.flatMap((key) => {
    const val = attributes[key]
    if (val === undefined || val === null) return []
    const label = key.replace('gen_ai.', '').replace('agentskitos.', '')
    const display = Array.isArray(val) ? val.join(', ') : String(val)
    return [{ key, label, display }]
  })

  if (relevant.length === 0) return null

  return (
    <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" data-testid="gen-ai-attrs">
      {relevant.map(({ key, label, display }) => (
        <div key={key} className="flex items-center gap-1 text-[0.65rem]">
          <dt className="text-ink-subtle font-mono">{label}</dt>
          <dd className="text-ink-muted font-mono">{display}</dd>
        </div>
      ))}
    </dl>
  )
}

// ---------------------------------------------------------------------------
// SpanRow
// ---------------------------------------------------------------------------

type SpanRowProps = {
  readonly node: SpanNode
  readonly depth: number
  readonly maxDurationMs: number
}

const SpanRow = ({
  node,
  depth,
  maxDurationMs,
}: SpanRowProps): React.JSX.Element => {
  const { span, children } = node
  const barWidthPct = Math.max(2, Math.round((span.durationMs / maxDurationMs) * 100))
  const kindColor = KIND_BADGE_COLORS[span.kind] ?? KIND_BADGE_COLORS['unknown']
  const statusColor = STATUS_COLORS[span.status]
  const statusBadge = STATUS_BADGE_COLORS[span.status]

  return (
    <li
      data-testid="span-row"
      data-span-id={span.spanId}
      data-depth={depth}
      className="list-none"
    >
      <div
        className="flex flex-col gap-0.5 py-1.5 pr-3 hover:bg-panel-alt rounded-md transition-colors"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {/* Rail indent lines */}
        {depth > 0 && (
          <div
            aria-hidden
            className="absolute left-0 top-0 bottom-0 border-l border-line/30"
            style={{ marginLeft: `${depth * 20}px` }}
          />
        )}

        {/* Header row: kind + name + status + duration */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Kind badge */}
          <span
            data-testid="span-kind"
            className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[0.6rem] font-medium border ${kindColor}`}
          >
            {span.kind}
          </span>

          {/* Span name */}
          <span
            data-testid="span-name"
            className="flex-1 min-w-0 truncate text-xs font-mono text-ink"
            title={span.name}
          >
            {span.name}
          </span>

          {/* Status badge */}
          <span
            data-testid="span-status"
            className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[0.6rem] font-medium border ${statusBadge}`}
          >
            {span.status}
          </span>

          {/* Duration */}
          <span
            data-testid="span-duration"
            className={`shrink-0 text-[0.65rem] font-mono tabular-nums ${statusColor}`}
          >
            {span.durationMs}ms
          </span>
        </div>

        {/* Duration bar */}
        <div
          data-testid="duration-bar-rail"
          className="h-1 rounded-full mt-0.5"
          style={{ background: 'color-mix(in srgb, var(--ag-accent) 10%, transparent)' }}
        >
          <div
            data-testid="duration-bar"
            data-width-pct={barWidthPct}
            className="h-full rounded-full"
            style={{
              width: `${barWidthPct}%`,
              background: 'var(--ag-accent)',
            }}
          />
        </div>

        {/* GenAI attributes */}
        <GenAiAttrs attributes={span.attributes} />

        {/* Error message */}
        {span.errorMessage !== undefined && (
          <p className="text-[0.65rem] text-red-400 font-mono mt-0.5 truncate" title={span.errorMessage}>
            {span.errorCode !== undefined ? `[${span.errorCode}] ` : ''}{span.errorMessage}
          </p>
        )}
      </div>

      {/* Recursive children */}
      {children.length > 0 && (
        <ul className="relative" data-testid="span-children">
          {children.map((child) => (
            <SpanRow
              key={child.span.spanId}
              node={child}
              depth={depth + 1}
              maxDurationMs={maxDurationMs}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// SpanTree root
// ---------------------------------------------------------------------------

export const SpanTree = ({
  spans,
  className,
}: SpanTreeProps): React.JSX.Element => {
  const tree = buildSpanTree(spans)
  const maxDuration = totalDurationMs(spans)

  if (spans.length === 0) {
    return (
      <div className={`flex items-center justify-center p-6 text-sm text-ink-subtle ${className ?? ''}`}>
        No spans for this trace.
      </div>
    )
  }

  return (
    <ul
      data-testid="span-tree"
      className={`relative flex flex-col gap-0 ${className ?? ''}`}
    >
      {tree.map((node) => (
        <SpanRow
          key={node.span.spanId}
          node={node}
          depth={0}
          maxDurationMs={maxDuration}
        />
      ))}
    </ul>
  )
}
