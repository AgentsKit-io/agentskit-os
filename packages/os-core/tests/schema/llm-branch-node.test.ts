import { describe, expect, it } from 'vitest'
import { parseFlowConfig, LlmBranchNode } from '../../src/index.js'

describe('LlmBranchNode (#67)', () => {
  it('parses a 3-branch llm-branch node', () => {
    const node = LlmBranchNode.parse({
      id: 'route',
      kind: 'llm-branch',
      agent: 'router',
      prompt: 'Pick the best branch given the issue body.',
      branches: [
        { outcome: 'security', description: 'Security-sensitive issue' },
        { outcome: 'docs' },
        { outcome: 'bug' },
      ],
      fallbackOutcome: 'bug',
    })
    expect(node.branches).toHaveLength(3)
    expect(node.branches[1]?.description).toBe('')
  })

  it('rejects a single-branch llm-branch node', () => {
    const r = LlmBranchNode.safeParse({
      id: 'route',
      kind: 'llm-branch',
      agent: 'router',
      prompt: 'p',
      branches: [{ outcome: 'only' }],
    })
    expect(r.success).toBe(false)
  })

  it('round-trips through parseFlowConfig + edges match outcomes', () => {
    const flow = parseFlowConfig({
      id: 'router-flow',
      name: 'Router',
      entry: 'route',
      tags: [],
      nodes: [
        {
          id: 'route',
          kind: 'llm-branch',
          agent: 'router',
          prompt: 'Decide.',
          branches: [
            { outcome: 'true', description: '' },
            { outcome: 'false', description: '' },
          ],
        },
        { id: 'a', kind: 'agent', agent: 'a' },
        { id: 'b', kind: 'agent', agent: 'b' },
      ],
      edges: [
        { from: 'route', to: 'a', on: 'true' },
        { from: 'route', to: 'b', on: 'false' },
      ],
    })
    expect(flow.nodes[0]?.kind).toBe('llm-branch')
  })
})
