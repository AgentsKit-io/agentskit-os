import { describe, expect, it } from 'vitest'
import {
  AgentConfig,
  WorkspaceConfig,
  SCHEMA_VERSION,
  forkAgentConfig,
  forkWorkspaceConfig,
} from '../../src/index.js'

const baseAgent = AgentConfig.parse({
  id: 'fix-bot',
  name: 'Fix Bot',
  description: 'Fixes things.',
  systemPrompt: 'help',
  model: { provider: 'anthropic', model: 'claude-opus-4-7' },
  tools: ['tools.git.diff'],
  skills: [],
  ragRefs: [],
  tags: ['existing'],
})

const baseWorkspace = WorkspaceConfig.parse({
  schemaVersion: SCHEMA_VERSION,
  id: 'org-default',
  name: 'Org Default',
  kind: 'personal',
  tags: ['team-a'],
})

describe('forkAgentConfig (#55)', () => {
  it('swaps id and appends "(fork)" to the name by default', () => {
    const f = forkAgentConfig(baseAgent, { newId: 'fix-bot-clone' })
    expect(f.id).toBe('fix-bot-clone')
    expect(f.name).toBe('Fix Bot (fork)')
  })

  it('honours newName override', () => {
    const f = forkAgentConfig(baseAgent, { newId: 'fix-bot-2', newName: 'Custom' })
    expect(f.name).toBe('Custom')
  })

  it('adds forked-from tag exactly once', () => {
    const f = forkAgentConfig(baseAgent, { newId: 'fb-2' })
    expect(f.tags).toContain('forked-from:fix-bot')
    const f2 = forkAgentConfig(f, { newId: 'fb-3' })
    expect(f2.tags.filter((t) => t === 'forked-from:fix-bot')).toHaveLength(1)
  })

  it('preserves model + tools + ragRefs', () => {
    const f = forkAgentConfig(baseAgent, { newId: 'fb-2' })
    expect(f.model).toEqual(baseAgent.model)
    expect(f.tools).toEqual(baseAgent.tools)
  })
})

describe('forkWorkspaceConfig (#55)', () => {
  it('clones the workspace with a new id + tag', () => {
    const f = forkWorkspaceConfig(baseWorkspace, { newId: 'org-fork' })
    expect(f.id).toBe('org-fork')
    expect(f.tags).toContain('forked-from:org-default')
    expect(f.kind).toBe('personal')
  })
})
