import { describe, expect, it } from 'vitest'
import { stringify as yamlStringify, parse as yamlParse } from 'yaml'
import { flowExport, flowImportJson } from '../src/commands/flow-json.js'
import { fakeIo } from './_fake-io.js'

const baseConfig = (flowId = 'f1') => yamlStringify({
  schemaVersion: 1,
  workspace: { schemaVersion: 1, id: 'ws', name: 'WS' },
  vault: { backend: 'os-keychain' },
  security: {},
  observability: {},
  flows: [
    {
      schemaVersion: 1,
      id: flowId,
      name: 'a flow',
      entry: 'n1',
      nodes: [{ id: 'n1', kind: 'tool', tool: 'search' }],
      edges: [],
    },
  ],
})

describe('flow export', () => {
  it('emits envelope JSON to stdout when no --out', async () => {
    const io = fakeIo({ '/work/cfg.yaml': baseConfig() })
    const r = await flowExport.run(['cfg.yaml', '--flow', 'f1'], io)
    expect(r.code).toBe(0)
    const env = JSON.parse(r.stdout)
    expect(env.format).toBe('agentskit-os/flow@1')
    expect(env.flow.id).toBe('f1')
  })

  it('writes JSON to --out path', async () => {
    const io = fakeIo({ '/work/cfg.yaml': baseConfig() })
    const r = await flowExport.run(['cfg.yaml', '--flow', 'f1', '--out', 'flow.json'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/flow.json')).toBe(true)
  })

  it('returns 8 when flow id missing', async () => {
    const io = fakeIo({ '/work/cfg.yaml': baseConfig() })
    const r = await flowExport.run(['cfg.yaml', '--flow', 'nope'], io)
    expect(r.code).toBe(8)
    expect(r.stderr).toContain('not found')
  })
})

describe('flow import-json', () => {
  it('appends a new flow under default merge mode', async () => {
    const io = fakeIo({ '/work/cfg.yaml': baseConfig('original') })
    const env = JSON.stringify({
      format: 'agentskit-os/flow@1',
      flow: {
        schemaVersion: 1,
        id: 'incoming',
        name: 'incoming',
        entry: 'n1',
        nodes: [{ id: 'n1', kind: 'tool', tool: 'search' }],
        edges: [],
      },
    })
    io.fs.files.set('/work/env.json', env)
    const r = await flowImportJson.run(['env.json', '--target', 'cfg.yaml'], io)
    expect(r.code).toBe(0)
    const cfg = yamlParse(io.fs.files.get('/work/cfg.yaml')!)
    expect(cfg.flows).toHaveLength(2)
  })

  it('errors with code 9 on id collision in merge mode', async () => {
    const io = fakeIo({ '/work/cfg.yaml': baseConfig('f1') })
    const env = JSON.stringify({
      format: 'agentskit-os/flow@1',
      flow: {
        schemaVersion: 1, id: 'f1', name: 'collide', entry: 'n1',
        nodes: [{ id: 'n1', kind: 'tool', tool: 't' }], edges: [],
      },
    })
    io.fs.files.set('/work/env.json', env)
    const r = await flowImportJson.run(['env.json', '--target', 'cfg.yaml'], io)
    expect(r.code).toBe(9)
    expect(r.stderr).toContain('flow_collision')
  })

  it('--replace overwrites the existing flow', async () => {
    const io = fakeIo({ '/work/cfg.yaml': baseConfig('f1') })
    const env = JSON.stringify({
      format: 'agentskit-os/flow@1',
      flow: {
        schemaVersion: 1, id: 'f1', name: 'replaced', entry: 'n1',
        nodes: [{ id: 'n1', kind: 'tool', tool: 'newone' }], edges: [],
      },
    })
    io.fs.files.set('/work/env.json', env)
    const r = await flowImportJson.run(['env.json', '--target', 'cfg.yaml', '--replace'], io)
    expect(r.code).toBe(0)
    const cfg = yamlParse(io.fs.files.get('/work/cfg.yaml')!)
    expect(cfg.flows[0].name).toBe('replaced')
  })
})
