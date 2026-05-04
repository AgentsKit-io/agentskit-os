import { describe, expect, it } from 'vitest'
import { resolveWorkspacePaths } from '../../src/runtime/workspace-paths.js'
import { parseWorkspaceConfig } from '../../src/schema/workspace.js'

const baseWs = (overrides: Record<string, unknown> = {}) =>
  parseWorkspaceConfig({
    schemaVersion: 1,
    id: 'acme',
    name: 'Acme',
    ...overrides,
  })

describe('resolveWorkspacePaths', () => {
  it('strict isolation namespaces under workspaces/<id>', () => {
    const paths = resolveWorkspacePaths(baseWs(), { projectDir: '/repo' })
    expect(paths.root).toBe('/repo/.agentskitos/workspaces/acme')
    expect(paths.vault).toBe('/repo/.agentskitos/workspaces/acme/vault')
    expect(paths.traces).toBe('/repo/.agentskitos/workspaces/acme/traces')
    expect(paths.sqlite).toBe('/repo/.agentskitos/workspaces/acme/state.sqlite')
    expect(paths.checkpoints).toBe('/repo/.agentskitos/workspaces/acme/checkpoints')
    expect(paths.secrets).toBe('/repo/.agentskitos/workspaces/acme/secrets')
  })

  it('shared isolation puts paths flat under base', () => {
    const ws = baseWs({ isolation: 'shared' })
    const paths = resolveWorkspacePaths(ws, { projectDir: '/repo' })
    expect(paths.root).toBe('/repo/.agentskitos')
    expect(paths.sqlite).toBe('/repo/.agentskitos/state.sqlite')
  })

  it('respects absolute workspace.dataDir', () => {
    const ws = baseWs({ dataDir: '/var/agentskitos/acme' })
    const paths = resolveWorkspacePaths(ws, { projectDir: '/repo' })
    expect(paths.root).toBe('/var/agentskitos/acme/workspaces/acme')
  })

  it('joins relative workspace.dataDir against projectDir', () => {
    const ws = baseWs({ dataDir: 'data' })
    const paths = resolveWorkspacePaths(ws, { projectDir: '/repo' })
    expect(paths.root).toBe('/repo/data/workspaces/acme')
  })

  it('AGENTSKITOS_HOME (options.home) overrides projectDir default', () => {
    const paths = resolveWorkspacePaths(baseWs(), {
      projectDir: '/repo',
      home: '/srv/agentskitos',
    })
    expect(paths.root).toBe('/srv/agentskitos/workspaces/acme')
  })

  it('falls back to userHome/.agentskitos when no projectDir', () => {
    const paths = resolveWorkspacePaths(baseWs(), { userHome: '/home/dev' })
    expect(paths.root).toBe('/home/dev/.agentskitos/workspaces/acme')
  })

  it('throws when no base path source provided', () => {
    expect(() => resolveWorkspacePaths(baseWs())).toThrow(/no_base_path/)
  })

  it('strict isolation prevents cross-workspace path collision', () => {
    const a = resolveWorkspacePaths(baseWs({ id: 'team-a' }), { projectDir: '/repo' })
    const b = resolveWorkspacePaths(baseWs({ id: 'team-b' }), { projectDir: '/repo' })
    expect(a.sqlite).not.toBe(b.sqlite)
    expect(a.vault).not.toBe(b.vault)
  })

  it('honors injected join (e.g. node:path for windows)', () => {
    const winJoin = (...s: string[]) => s.filter(Boolean).join('\\')
    const paths = resolveWorkspacePaths(baseWs(), {
      projectDir: 'C:\\repo',
      join: winJoin,
    })
    expect(paths.root).toContain('\\workspaces\\acme')
  })
})
