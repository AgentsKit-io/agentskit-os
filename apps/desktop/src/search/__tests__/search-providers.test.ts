/**
 * Unit tests for search-providers.ts.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  workspaceEntities,
  agentEntities,
  flowEntities,
  traceEntities,
  commandEntities,
  docEntities,
  gatherEntities,
  BUILT_IN_DOC_LINKS,
} from '../search-providers'
import type { Workspace } from '../../workspaces/types'
import type { Command } from '../../command-palette/commands'
import type { TraceRow } from '../../screens/traces/use-traces'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WORKSPACES: Workspace[] = [
  { id: 'ws-1', name: 'Default', status: 'idle' },
  { id: 'ws-2', name: 'Production', status: 'running' },
]

const TRACES: TraceRow[] = [
  { traceId: 'trace-001', flowId: 'my-flow', runMode: 'real', startedAt: '', durationMs: 100, status: 'ok' },
]

const CMD: Command = {
  id: 'nav.dashboard',
  label: 'Go to Dashboard',
  keywords: ['home'],
  category: 'Navigation',
  run: vi.fn(),
}

// ---------------------------------------------------------------------------
// workspaceEntities
// ---------------------------------------------------------------------------

describe('workspaceEntities', () => {
  it('maps each workspace to a SearchEntity with kind=workspace', () => {
    const entities = workspaceEntities(WORKSPACES)
    expect(entities).toHaveLength(2)
    expect(entities[0]?.kind).toBe('workspace')
    expect(entities[0]?.label).toBe('Default')
    expect(entities[0]?.subtitle).toBe('idle')
    expect(entities[0]?.id).toBe('workspace:ws-1')
  })
})

// ---------------------------------------------------------------------------
// agentEntities
// ---------------------------------------------------------------------------

describe('agentEntities', () => {
  it('maps agents correctly', () => {
    const agents = [{ id: 'a1', name: 'Onboarding Agent', description: 'Handles onboarding' }]
    const entities = agentEntities(agents)
    expect(entities[0]?.kind).toBe('agent')
    expect(entities[0]?.label).toBe('Onboarding Agent')
    expect(entities[0]?.subtitle).toBe('Handles onboarding')
  })

  it('returns empty array for no agents', () => {
    expect(agentEntities([])).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// flowEntities
// ---------------------------------------------------------------------------

describe('flowEntities', () => {
  it('maps flows with kind=flow', () => {
    const flows = [{ id: 'f1', name: 'Data Pipeline' }]
    const entities = flowEntities(flows)
    expect(entities[0]?.kind).toBe('flow')
    expect(entities[0]?.label).toBe('Data Pipeline')
  })
})

// ---------------------------------------------------------------------------
// traceEntities
// ---------------------------------------------------------------------------

describe('traceEntities', () => {
  it('maps trace rows to SearchEntity with kind=trace', () => {
    const entities = traceEntities(TRACES)
    expect(entities[0]?.kind).toBe('trace')
    expect(entities[0]?.label).toBe('trace-001')
    expect(entities[0]?.subtitle).toContain('my-flow')
    expect(entities[0]?.id).toBe('trace:trace-001')
  })
})

// ---------------------------------------------------------------------------
// commandEntities
// ---------------------------------------------------------------------------

describe('commandEntities', () => {
  it('maps commands with kind=command', () => {
    const entities = commandEntities([CMD])
    expect(entities[0]?.kind).toBe('command')
    expect(entities[0]?.label).toBe('Go to Dashboard')
    expect(entities[0]?.subtitle).toBe('Navigation')
  })

  it('calls the onCommandRun callback when run is invoked', () => {
    const onRun = vi.fn()
    const entities = commandEntities([CMD], onRun)
    entities[0]?.run()
    expect(onRun).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// docEntities
// ---------------------------------------------------------------------------

describe('docEntities', () => {
  it('maps docs with kind=doc', () => {
    const entities = docEntities(BUILT_IN_DOC_LINKS)
    expect(entities.length).toBeGreaterThan(0)
    expect(entities[0]?.kind).toBe('doc')
  })
})

// ---------------------------------------------------------------------------
// gatherEntities
// ---------------------------------------------------------------------------

describe('gatherEntities', () => {
  it('returns a flat array combining all providers', () => {
    const entities = gatherEntities({
      workspaces: WORKSPACES,
      commands: [CMD],
      traces: TRACES,
    })
    const kinds = entities.map((e) => e.kind)
    expect(kinds).toContain('workspace')
    expect(kinds).toContain('command')
    expect(kinds).toContain('trace')
    expect(kinds).toContain('doc')
  })

  it('includes built-in doc links by default', () => {
    const entities = gatherEntities({ workspaces: [], commands: [], traces: [] })
    expect(entities.some((e) => e.kind === 'doc')).toBe(true)
  })

  it('returns unique ids across kinds', () => {
    const entities = gatherEntities({ workspaces: WORKSPACES, commands: [CMD], traces: TRACES })
    const ids = entities.map((e) => e.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})
