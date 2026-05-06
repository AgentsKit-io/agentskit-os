/**
 * SpanTree unit tests.
 *
 * Verifies:
 * - 3-span tree renders correctly (root + child + grandchild)
 * - Indent levels (data-depth attributes)
 * - Duration bar widths are proportional
 * - gen_ai.* attributes are shown when present
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SpanTree, buildSpanTree } from '../span-tree'
import type { Span } from '../use-traces'

// ---------------------------------------------------------------------------
// Mock data — 3-span tree
// ---------------------------------------------------------------------------

const ROOT_SPAN: Span = {
  traceId: 'test-trace',
  spanId: 'root',
  kind: 'flow',
  name: 'flow.started',
  workspaceId: 'ws-test',
  startedAt: '2026-01-01T00:00:00.000Z',
  endedAt: '2026-01-01T00:00:04.000Z',
  durationMs: 4000,
  status: 'ok',
  attributes: {
    'agentskitos.flow_id': 'test-flow',
  },
}

const CHILD_SPAN: Span = {
  traceId: 'test-trace',
  spanId: 'child',
  parentSpanId: 'root',
  kind: 'agent',
  name: 'agent.started',
  workspaceId: 'ws-test',
  startedAt: '2026-01-01T00:00:00.200Z',
  endedAt: '2026-01-01T00:00:03.200Z',
  durationMs: 3000,
  status: 'ok',
  attributes: {
    'gen_ai.system': 'anthropic',
    'gen_ai.request.model': 'claude-sonnet-4-6',
    'gen_ai.usage.input_tokens': 256,
    'gen_ai.usage.output_tokens': 64,
  },
}

const GRANDCHILD_SPAN: Span = {
  traceId: 'test-trace',
  spanId: 'grandchild',
  parentSpanId: 'child',
  kind: 'tool',
  name: 'tool.started',
  workspaceId: 'ws-test',
  startedAt: '2026-01-01T00:00:01.000Z',
  endedAt: '2026-01-01T00:00:02.000Z',
  durationMs: 1000,
  status: 'ok',
  attributes: {},
}

const THREE_SPANS: readonly Span[] = [ROOT_SPAN, CHILD_SPAN, GRANDCHILD_SPAN]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildSpanTree', () => {
  it('builds a root node with nested children', () => {
    const tree = buildSpanTree(THREE_SPANS)
    expect(tree).toHaveLength(1)
    expect(tree[0]?.span.spanId).toBe('root')
    expect(tree[0]?.children).toHaveLength(1)
    expect(tree[0]?.children[0]?.span.spanId).toBe('child')
    expect(tree[0]?.children[0]?.children).toHaveLength(1)
    expect(tree[0]?.children[0]?.children[0]?.span.spanId).toBe('grandchild')
  })

  it('returns multiple roots when multiple spans have no parent', () => {
    const flat: readonly Span[] = [ROOT_SPAN, { ...ROOT_SPAN, spanId: 'root2' }]
    const tree = buildSpanTree(flat)
    expect(tree).toHaveLength(2)
  })
})

describe('SpanTree', () => {
  it('renders all three span rows', () => {
    render(<SpanTree spans={THREE_SPANS} />)
    const rows = screen.getAllByTestId('span-row')
    expect(rows).toHaveLength(3)
  })

  it('assigns correct depth attributes', () => {
    render(<SpanTree spans={THREE_SPANS} />)
    const rows = screen.getAllByTestId('span-row')

    const depths = rows.map((r) => r.getAttribute('data-depth'))
    expect(depths).toContain('0') // root
    expect(depths).toContain('1') // child
    expect(depths).toContain('2') // grandchild
  })

  it('renders span names', () => {
    render(<SpanTree spans={THREE_SPANS} />)
    expect(screen.getByText('flow.started')).toBeInTheDocument()
    expect(screen.getByText('agent.started')).toBeInTheDocument()
    expect(screen.getByText('tool.started')).toBeInTheDocument()
  })

  it('renders duration bars with proportional widths', () => {
    render(<SpanTree spans={THREE_SPANS} />)
    const bars = screen.getAllByTestId('duration-bar')
    expect(bars).toHaveLength(3)

    // Root span (4000ms) should have 100% bar
    const rootBar = bars.find((b) => {
      const row = b.closest('[data-span-id="root"]')
      return row !== null
    })
    expect(rootBar).toBeDefined()
    const rootPct = rootBar?.getAttribute('data-width-pct')
    expect(Number(rootPct)).toBeGreaterThanOrEqual(98) // 100% or close

    // Grandchild (1000ms / 4000ms = 25%) should have smaller bar
    const gcBar = bars.find((b) => {
      const row = b.closest('[data-span-id="grandchild"]')
      return row !== null
    })
    expect(gcBar).toBeDefined()
    const gcPct = gcBar?.getAttribute('data-width-pct')
    expect(Number(gcPct)).toBeLessThan(50)
    expect(Number(gcPct)).toBeGreaterThan(0)
  })

  it('renders gen_ai.* attributes for agent span', () => {
    render(<SpanTree spans={THREE_SPANS} />)
    const attrsEls = screen.getAllByTestId('gen-ai-attrs')
    expect(attrsEls.length).toBeGreaterThan(0)

    // Should display model name
    expect(screen.getByText('claude-sonnet-4-6')).toBeInTheDocument()
    // Should display system
    expect(screen.getByText('anthropic')).toBeInTheDocument()
  })

  it('renders empty state when no spans are provided', () => {
    render(<SpanTree spans={[]} />)
    expect(screen.getByText('No spans for this trace.')).toBeInTheDocument()
  })

  it('renders span-tree container with correct testid', () => {
    render(<SpanTree spans={THREE_SPANS} />)
    expect(screen.getByTestId('span-tree')).toBeInTheDocument()
  })
})
