import { describe, expect, it } from 'vitest'
import { LockfileStore } from '../src/index.js'
import { fakeFs } from './_fake-fs.js'
import {
  LOCKFILE_VERSION,
  type Lockfile,
} from '@agentskit/os-core/lockfile/lock'

const SHA256 = 'sha256:' + 'a'.repeat(64)

const valid: Lockfile = {
  lockfileVersion: LOCKFILE_VERSION,
  generatedAt: '2026-05-02T00:00:00.000Z',
  generatedBy: 'agentskit-os/0.0.0',
  workspace: { id: 'team-a', configHash: SHA256, configPath: 'agentskit-os.config.yaml' },
  plugins: [],
  agents: [],
  flows: [],
  providers: [],
  tools: [],
  templates: [],
  schemas: { osCore: '0.1.0', workspaceConfig: 1 },
  tags: [],
}

describe('LockfileStore', () => {
  it('writes + reads round-trip', async () => {
    const fs = fakeFs()
    const store = new LockfileStore({ fs })
    await store.write('/work/agentskit-os.lock', valid)
    expect(fs.files.has('/work/agentskit-os.lock')).toBe(true)
    const loaded = await store.read('/work/agentskit-os.lock')
    expect(loaded.workspace.id).toBe('team-a')
    expect(loaded.lockfileVersion).toBe(1)
  })

  it('writes header when provided', async () => {
    const fs = fakeFs()
    const store = new LockfileStore({ fs })
    await store.write('/work/agentskit-os.lock', valid, '# AgentsKitOS lockfile')
    const raw = fs.files.get('/work/agentskit-os.lock')!
    expect(raw.startsWith('# AgentsKitOS lockfile')).toBe(true)
  })

  it('exists returns true after write', async () => {
    const fs = fakeFs()
    const store = new LockfileStore({ fs })
    expect(await store.exists('/work/agentskit-os.lock')).toBe(false)
    await store.write('/work/agentskit-os.lock', valid)
    expect(await store.exists('/work/agentskit-os.lock')).toBe(true)
  })

  it('rejects malformed YAML on read', async () => {
    const fs = fakeFs({ '/work/bad.lock': '{not yaml::: }}}' })
    const store = new LockfileStore({ fs })
    await expect(store.read('/work/bad.lock')).rejects.toThrow()
  })

  it('rejects schema-invalid lock on read', async () => {
    const fs = fakeFs({ '/work/x.lock': 'lockfileVersion: 99\n' })
    const store = new LockfileStore({ fs })
    await expect(store.read('/work/x.lock')).rejects.toThrow()
  })
})
