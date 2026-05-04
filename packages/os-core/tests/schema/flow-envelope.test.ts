import { describe, expect, it } from 'vitest'
import {
  FLOW_ENVELOPE_FORMAT,
  canonicalFlowBody,
  parseFlowEnvelope,
} from '../../src/schema/flow-envelope.js'
import type { FlowConfig } from '../../src/schema/flow.js'

const flow: FlowConfig = {
  schemaVersion: 1,
  id: 'f1',
  name: 'test',
  entry: 'a',
  nodes: [{ id: 'a', kind: 'agent', agent: 'a' }],
  edges: [],
} as unknown as FlowConfig

describe('FlowEnvelope', () => {
  it('parses minimal envelope', () => {
    const e = parseFlowEnvelope({ format: FLOW_ENVELOPE_FORMAT, flow })
    expect(e.format).toBe(FLOW_ENVELOPE_FORMAT)
    expect(e.flow.id).toBe('f1')
  })

  it('rejects wrong format string', () => {
    expect(() => parseFlowEnvelope({ format: 'agentskit-os/flow@2', flow })).toThrow()
  })

  it('parses envelope with signature', () => {
    const e = parseFlowEnvelope({
      format: FLOW_ENVELOPE_FORMAT,
      flow,
      signature: {
        algorithm: 'ed25519',
        publicKey: 'pk',
        signature: 'sig',
        note: 'signed by ci',
      },
    })
    expect(e.signature?.algorithm).toBe('ed25519')
  })
})

describe('canonicalFlowBody', () => {
  it('sorts keys recursively for stable output', () => {
    const a = { schemaVersion: 1, id: 'x', name: 'n', entry: 'a', nodes: [{ id: 'a', kind: 'tool', tool: 't' }], edges: [] } as unknown as FlowConfig
    const b = { id: 'x', schemaVersion: 1, entry: 'a', edges: [], nodes: [{ tool: 't', id: 'a', kind: 'tool' }], name: 'n' } as unknown as FlowConfig
    expect(canonicalFlowBody(a)).toBe(canonicalFlowBody(b))
  })
})
