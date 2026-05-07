import { describe, expect, it } from 'vitest'
import { parseFlowConfig } from '@agentskit/os-core'
import { buildPipelineExport } from '../src/pipeline-export.js'

const flow = parseFlowConfig({
  id: 'export-flow',
  name: 'Export Flow',
  entry: 'a',
  tags: [],
  nodes: [{ id: 'a', kind: 'agent', agent: 'researcher' }],
  edges: [],
})

describe('buildPipelineExport (#70)', () => {
  it('docker target emits Dockerfile + flow.json', () => {
    const out = buildPipelineExport({ flow, target: 'docker' })
    const paths = out.map((a) => a.path)
    expect(paths).toContain('Dockerfile')
    expect(paths).toContain('flow.json')
    const docker = out.find((a) => a.path === 'Dockerfile')!
    expect(docker.content).toContain('FROM node:22-alpine')
  })

  it('exe target emits start.sh', () => {
    const out = buildPipelineExport({ flow, target: 'exe' })
    expect(out.some((a) => a.path === 'start.sh')).toBe(true)
  })

  it('extraFiles round-trip into the artifact set', () => {
    const out = buildPipelineExport({
      flow,
      target: 'docker',
      extraFiles: { 'README.md': '# Pipeline' },
    })
    expect(out.some((a) => a.path === 'README.md' && a.content === '# Pipeline')).toBe(true)
  })

  it('flow.json content is canonical JSON of the FlowConfig', () => {
    const out = buildPipelineExport({ flow, target: 'docker' })
    const flowArt = out.find((a) => a.path === 'flow.json')!
    const parsed = JSON.parse(flowArt.content) as { id: string }
    expect(parsed.id).toBe('export-flow')
  })
})
