import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CodingTaskRequest, CodingTaskResult } from '@agentskit/os-core'
import git from 'isomorphic-git'
import fs from 'node:fs'
import type { GitDiffResult } from './git-diff.js'
import { computeGitDiff } from './git-diff.js'

export type CodingAgentArtifactIds = {
  readonly runId: string
  readonly taskId: string
  readonly providerId: string
  readonly worktreeId?: string
  readonly traceId?: string
}

export type CodingRunArtifactPhase = 'setup_failed' | 'provider_completed' | 'provider_threw'

export type CodingRunGitRefDiffSummary = {
  readonly from: string
  readonly to: string
  readonly paths: readonly string[]
  readonly hunkCount: number
}

export type CodingRunArtifactPayload = {
  readonly schemaVersion: '1.0'
  readonly ids: CodingAgentArtifactIds
  readonly capturedAt: string
  readonly benchmarkIndex: number
  readonly phase: CodingRunArtifactPhase
  readonly setupError?: string
  readonly taskRequest?: CodingTaskRequest
  readonly taskResult?: CodingTaskResult
  readonly git?: {
    readonly headBefore?: string
    readonly headAfter?: string
    readonly refDiff?: CodingRunGitRefDiffSummary
  }
}

const redactString = (s: string, r?: (x: string) => string): string => {
  if (r !== undefined) {
    return r(s)
  }
  return s
}

export const redactCodingTaskRequest = (
  req: CodingTaskRequest,
  r?: (x: string) => string,
): CodingTaskRequest => ({
  ...req,
  prompt: redactString(req.prompt, r),
  readScope: req.readScope.map((x) => redactString(x, r)),
  writeScope: req.writeScope.map((x) => redactString(x, r)),
  granted: req.granted.map((x) => redactString(x, r)) as CodingTaskRequest['granted'],
})

export const redactCodingTaskResult = (
  res: CodingTaskResult,
  r?: (x: string) => string,
): CodingTaskResult => ({
  ...res,
  summary: redactString(res.summary, r),
  files: res.files.map((f) => ({
    ...f,
    ...(f.before !== undefined ? { before: redactString(f.before, r) } : {}),
    after: redactString(f.after, r),
  })),
  shell: res.shell.map((s) => ({
    ...s,
    command: redactString(s.command, r),
    stdout: redactString(s.stdout, r),
    stderr: redactString(s.stderr, r),
  })),
  tools: res.tools.map((t) => ({
    ...t,
    args: redactString(t.args, r),
    ...(t.detail !== undefined ? { detail: redactString(t.detail, r) } : {}),
  })),
})

export const summarizeGitDiffForArtifact = (diff: GitDiffResult): CodingRunGitRefDiffSummary => {
  const paths = diff.files.map((f) => f.path)
  const hunkCount = diff.files.reduce((n, f) => n + f.hunks.length, 0)
  return { from: diff.from, to: diff.to, paths, hunkCount }
}

export const tryGitRefDiffSummary = async (
  repoRoot: string,
  from: string,
  to: string,
): Promise<CodingRunGitRefDiffSummary | undefined> => {
  try {
    const full = await computeGitDiff({ repoRoot, from, to })
    if (full.files.length === 0) {
      return { from: full.from, to: full.to, paths: [], hunkCount: 0 }
    }
    return summarizeGitDiffForArtifact(full)
  } catch {
    return undefined
  }
}

export const resolveHeadOidSafe = async (dir: string): Promise<string | undefined> => {
  try {
    return await git.resolveRef({ fs, dir, ref: 'HEAD' })
  } catch {
    return undefined
  }
}

export const buildCodingRunArtifactPayload = (args: {
  readonly ids: CodingAgentArtifactIds
  readonly benchmarkIndex: number
  readonly phase: CodingRunArtifactPhase
  readonly setupError?: string
  readonly taskRequest?: CodingTaskRequest
  readonly taskResult?: CodingTaskResult
  readonly redact?: (s: string) => string
  readonly git?: CodingRunArtifactPayload['git']
}): CodingRunArtifactPayload => {
  const capturedAt = new Date().toISOString()
  const req = args.taskRequest !== undefined ? redactCodingTaskRequest(args.taskRequest, args.redact) : undefined
  const res = args.taskResult !== undefined ? redactCodingTaskResult(args.taskResult, args.redact) : undefined
  return {
    schemaVersion: '1.0',
    ids: args.ids,
    capturedAt,
    benchmarkIndex: args.benchmarkIndex,
    phase: args.phase,
    ...(args.setupError !== undefined ? { setupError: redactString(args.setupError, args.redact) } : {}),
    ...(req !== undefined ? { taskRequest: req } : {}),
    ...(res !== undefined ? { taskResult: res } : {}),
    ...(args.git !== undefined ? { git: args.git } : {}),
  }
}

export const artifactFilenameForBenchmarkStep = (
  runId: string,
  index: number,
  providerId: string,
): string => {
  const safeRun = runId.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 48)
  const safePid = providerId.replace(/[^a-zA-Z0-9._-]+/g, '_')
  return `coding-run-artifact-${safeRun}-${index}-${safePid}.json`
}

export const writeCodingRunArtifactFile = async (
  outDir: string,
  filename: string,
  payload: CodingRunArtifactPayload,
): Promise<void> => {
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, filename), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}
