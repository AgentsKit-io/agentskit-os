import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadWorkspaceConfig, resolveWorkspacePath } from '../src/workspace-loader.js'

const yamlBody = (id: string) => `
workspace:
  schemaVersion: 1
  id: ${id}
  name: ${id}-name
  kind: personal
  tags: []
secrets:
  ANTHROPIC_API_KEY: sk-test-anthropic
agents:
  - id: planner
flows: []
triggers: []
`

describe('loadWorkspaceConfig', () => {
  it('returns null when no candidate file exists', async () => {
    expect(await resolveWorkspacePath({ path: '/does/not/exist.yaml' })).toBeUndefined()
    expect(await loadWorkspaceConfig({ path: '/does/not/exist.yaml' })).toBeNull()
  })

  it('parses a YAML workspace + secrets + inline blocks', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ak-ws-'))
    try {
      const path = join(dir, 'workspace.yaml')
      await writeFile(path, yamlBody('test-ws'), 'utf8')
      const loaded = await loadWorkspaceConfig({ path })
      expect(loaded).not.toBeNull()
      if (loaded === null) return
      expect(loaded.source).toBe(path)
      expect(loaded.workspace.id).toBe('test-ws')
      expect(loaded.secrets['ANTHROPIC_API_KEY']).toBe('sk-test-anthropic')
      expect(loaded.inline.agents).toHaveLength(1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('parses a JSON workspace when extension is .json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ak-ws-'))
    try {
      const path = join(dir, 'workspace.json')
      const body = {
        workspace: {
          schemaVersion: 1, id: 'json-ws', name: 'JSON', kind: 'personal', tags: [],
        },
      }
      await writeFile(path, JSON.stringify(body), 'utf8')
      const loaded = await loadWorkspaceConfig({ path })
      expect(loaded?.workspace.id).toBe('json-ws')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('throws when file exists but workspace block is invalid', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ak-ws-'))
    try {
      const path = join(dir, 'bad.yaml')
      await writeFile(path, 'workspace:\n  bogus: true\n', 'utf8')
      await expect(loadWorkspaceConfig({ path })).rejects.toThrow()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
