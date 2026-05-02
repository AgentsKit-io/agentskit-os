import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { route } from '../src/router.js'
import { fakeIo } from './_fake-io.js'

const n8nWorkflow = JSON.stringify({
  name: 'PR Review',
  id: 'wf_123',
  nodes: [
    {
      id: 'n1',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      parameters: {},
    },
    {
      id: 'n2',
      name: 'Reviewer',
      type: '@n8n/n8n-nodes-langchain.agent',
      parameters: { model: 'gpt-4o' },
    },
  ],
  connections: {
    Webhook: { main: [[{ node: 'Reviewer' }]] },
  },
})

describe('import', () => {
  it('shows help when no input', async () => {
    const r = await route(['import'])
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('agentskit-os import')
  })

  it('rejects unknown flag', async () => {
    const r = await route(['import', 'wf.json', '--cosmic'], fakeIo())
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('unknown flag')
  })

  it('errors on read failure', async () => {
    const r = await route(['import', 'missing.json'], fakeIo({}))
    expect(r.code).toBe(3)
  })

  it('errors when no importer matches', async () => {
    const r = await route(
      ['import', 'unrelated.json'],
      fakeIo({ '/work/unrelated.json': '{"foo":"bar"}' }),
    )
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('no importer matched')
  })

  it('rejects unknown --source', async () => {
    const r = await route(
      ['import', 'wf.json', '--source', 'cosmic'],
      fakeIo({ '/work/wf.json': n8nWorkflow }),
    )
    expect(r.code).toBe(2)
    expect(r.stderr).toContain('unknown --source')
  })

  it('translates n8n workflow to stdout YAML', async () => {
    const r = await route(['import', 'wf.json'], fakeIo({ '/work/wf.json': n8nWorkflow }))
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('imported from n8n')
    const yaml = r.stdout.split('\n\n').slice(1).join('\n\n').split('\n---\n')[0]!
    const parsed = parseYaml(yaml)
    expect(parsed.workspace.name).toBe('PR Review')
    expect(parsed.flows).toHaveLength(1)
    expect(parsed.agents).toHaveLength(1)
  })

  it('writes to --out path', async () => {
    const io = fakeIo({ '/work/wf.json': n8nWorkflow })
    const r = await route(['import', 'wf.json', '--out', 'out.yaml'], io)
    expect(r.code).toBe(0)
    expect(io.fs.files.has('/work/out.yaml')).toBe(true)
    expect(r.stdout).toContain('wrote')
  })

  it('honors --workspace override', async () => {
    const io = fakeIo({ '/work/wf.json': n8nWorkflow })
    const r = await route(
      ['import', 'wf.json', '--out', 'out.yaml', '--workspace', 'team-renamed'],
      io,
    )
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('workspace=team-renamed')
    const yaml = io.fs.files.get('/work/out.yaml')!
    expect(yaml).toContain('id: team-renamed')
  })

  it('honors --source forced importer', async () => {
    const r = await route(
      ['import', 'wf.json', '--source', 'n8n'],
      fakeIo({ '/work/wf.json': n8nWorkflow }),
    )
    expect(r.code).toBe(0)
  })

  it('--quiet suppresses warnings block', async () => {
    const wfWithUnknown = JSON.stringify({
      name: 'Mystery',
      id: 'wf_x',
      nodes: [
        { name: 'Trigger', type: 'n8n-nodes-base.webhook' },
        { name: 'X', type: 'random.vendor.thing' },
      ],
      connections: {},
    })
    const noisy = await route(['import', 'wf.json'], fakeIo({ '/work/wf.json': wfWithUnknown }))
    expect(noisy.stdout).toContain('warning')
    const quiet = await route(
      ['import', 'wf.json', '--quiet'],
      fakeIo({ '/work/wf.json': wfWithUnknown }),
    )
    expect(quiet.stdout).not.toContain('warning')
  })

  it('langflow with empty nodes reports parse error', async () => {
    const langflow = JSON.stringify({ name: 'x', data: { nodes: [], edges: [] } })
    const r = await route(['import', 'lf.json'], fakeIo({ '/work/lf.json': langflow }))
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('no nodes')
  })

  it('translates a langflow workflow', async () => {
    const langflow = JSON.stringify({
      name: 'LF Test',
      data: {
        nodes: [
          { id: 'ChatInput-1', data: { type: 'ChatInput', display_name: 'In' } },
          {
            id: 'OpenAI-1',
            data: {
              type: 'OpenAIComponent',
              display_name: 'GPT',
              node: { template: { model_name: { value: 'gpt-4o' } } },
            },
          },
        ],
        edges: [{ source: 'ChatInput-1', target: 'OpenAI-1' }],
      },
    })
    const r = await route(['import', 'lf.json'], fakeIo({ '/work/lf.json': langflow }))
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('imported from langflow')
  })

  it('dify placeholder still reports not-implemented', async () => {
    const dify = JSON.stringify({ app: {}, workflow: {} })
    const r = await route(['import', 'd.json'], fakeIo({ '/work/d.json': dify }))
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('not yet implemented')
  })
})
