import { describe, expect, it } from 'vitest'
import {
  WorkspaceConfig,
  SCHEMA_VERSION,
  buildWorkspaceBundle,
  verifyWorkspaceBundle,
} from '../../src/index.js'

const ws = WorkspaceConfig.parse({
  schemaVersion: SCHEMA_VERSION,
  id: 'org-default',
  name: 'Org Default',
  kind: 'personal',
  tags: [],
})

describe('workspace migration bundle (#236)', () => {
  it('produces a bundle whose integrity verifies', async () => {
    const bundle = await buildWorkspaceBundle({
      workspace: ws,
      agents: [],
      flows: [],
      triggers: [],
      templates: [],
      clock: () => '2026-05-06T12:00:00Z',
    })
    const v = await verifyWorkspaceBundle(bundle)
    expect(v.ok).toBe(true)
    expect(bundle.exportedAt).toBe('2026-05-06T12:00:00Z')
  })

  it('rejects a tampered bundle', async () => {
    const bundle = await buildWorkspaceBundle({
      workspace: ws,
      agents: [],
      flows: [],
      triggers: [],
      templates: [],
    })
    const tampered = { ...bundle, agents: [{ ...ws } as never] }
    const v = await verifyWorkspaceBundle(tampered)
    expect(v.ok).toBe(false)
  })

  it('integrity is stable across re-export with same content', async () => {
    const a = await buildWorkspaceBundle({
      workspace: ws,
      agents: [],
      flows: [],
      triggers: [],
      templates: [],
      clock: () => '2026-05-06T12:00:00Z',
    })
    const b = await buildWorkspaceBundle({
      workspace: ws,
      agents: [],
      flows: [],
      triggers: [],
      templates: [],
      clock: () => '2099-01-01T00:00:00Z',
    })
    expect(a.integrity).toBe(b.integrity)
  })
})
