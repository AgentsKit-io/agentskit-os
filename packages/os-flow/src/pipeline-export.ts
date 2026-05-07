// Per #70 — export pipeline as standalone exe / Docker.
// Pure: builds Dockerfile + runtime descriptor strings the CLI writes to disk.

import type { FlowConfig } from '@agentskit/os-core'

export type PipelineExportTarget = 'docker' | 'exe'

export type PipelineExportInput = {
  readonly flow: FlowConfig
  readonly target: PipelineExportTarget
  readonly nodeVersion?: string
  readonly entrypoint?: string
  /** Extra files (path → content) the export embeds alongside the runtime. */
  readonly extraFiles?: Readonly<Record<string, string>>
}

export type PipelineExportArtifact = {
  readonly path: string
  readonly content: string
}

const DEFAULT_NODE = '22'
const DEFAULT_ENTRY = 'node_modules/@agentskit/os-headless/bin/run.js'

const dockerfile = (input: PipelineExportInput): string => {
  const node = input.nodeVersion ?? DEFAULT_NODE
  const entry = input.entrypoint ?? DEFAULT_ENTRY
  return [
    `FROM node:${node}-alpine`,
    `WORKDIR /app`,
    `COPY pnpm-lock.yaml package.json ./`,
    `RUN corepack enable && pnpm install --frozen-lockfile --prod`,
    `COPY flow.json ./`,
    `ENV AGENTSKIT_FLOW=/app/flow.json`,
    `CMD ["node", "${entry}"]`,
  ].join('\n') + '\n'
}

const startScript = (input: PipelineExportInput): string => {
  const entry = input.entrypoint ?? DEFAULT_ENTRY
  return [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    'export AGENTSKIT_FLOW="${AGENTSKIT_FLOW:-./flow.json}"',
    `node "${entry}"`,
    '',
  ].join('\n')
}

/**
 * Build the file artifact set for a pipeline export (#70). Pure; caller
 * writes the artifacts to disk + invokes the platform-specific packager
 * (`docker build` / `pkg` / `nexe`).
 */
export const buildPipelineExport = (input: PipelineExportInput): readonly PipelineExportArtifact[] => {
  const artifacts: PipelineExportArtifact[] = [
    { path: 'flow.json', content: `${JSON.stringify(input.flow, null, 2)}\n` },
  ]
  if (input.target === 'docker') {
    artifacts.push({ path: 'Dockerfile', content: dockerfile(input) })
  } else {
    artifacts.push({ path: 'start.sh', content: startScript(input) })
  }
  if (input.extraFiles !== undefined) {
    for (const [path, content] of Object.entries(input.extraFiles)) {
      artifacts.push({ path, content })
    }
  }
  return artifacts
}
