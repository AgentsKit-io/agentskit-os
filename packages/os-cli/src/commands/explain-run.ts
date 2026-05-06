// Per #224 — `agentskit-os explain <run-id>` prints a plain-English step list
// from a run-artifact directory captured by --capture-run-artifacts (#367).

import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Command } from 'commander'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

type ArtifactRow = {
  readonly file: string
  readonly index: number
  readonly providerId: string
  readonly phase: string
  readonly capturedAt: string
  readonly summary: string
  readonly status: string
  readonly fileEditCount: number
  readonly setupError?: string
  readonly diffPaths?: readonly string[]
}

type RawFile = {
  path?: string
}

type RawTaskResult = {
  files?: RawFile[]
  summary?: string
  status?: string
  errorCode?: string
}

type RawIds = {
  runId?: string
  providerId?: string
}

type RawArtifact = {
  ids?: RawIds
  phase?: string
  capturedAt?: string
  benchmarkIndex?: number
  taskResult?: RawTaskResult
  setupError?: string
}

type RawSummaryTaskResult = {
  summary?: unknown
  status?: unknown
  files?: unknown[]
  errorCode?: unknown
}

type RawSummaryInput = {
  taskResult?: RawSummaryTaskResult
  setupError?: unknown
}

type ExplainOpts = {
  artifactDir: string
  runId?: string
  json?: boolean
}

const ARTIFACT_FILENAME = /^coding-run-artifact-/

const phaseLabel = (phase: string, status: string, setupError?: string): string => {
  if (phase === 'setup_failed') return `setup failed${setupError ? ` (${setupError})` : ''}`
  if (phase === 'provider_threw') return 'provider threw an error'
  if (phase === 'run_cancelled') return 'run cancelled before this provider started'
  if (phase === 'provider_completed') {
    if (status === 'ok') return 'provider completed successfully'
    if (status === 'partial') return 'provider produced a partial result'
    if (status === 'timeout') return 'provider hit the configured timeout'
    if (status === 'fail') return 'provider returned a failure'
  }
  return `${phase} / ${status}`
}

const indexFromArtifact = (
  raw: { benchmarkIndex?: unknown },
): number => {
  const v = raw.benchmarkIndex
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

const summaryOfRow = (
  raw: RawSummaryInput,
): { summary: string; status: string; fileEditCount: number; setupError?: string } => {
  const setup = typeof raw.setupError === 'string' ? raw.setupError : undefined
  const tr = raw.taskResult ?? {}
  const summary =
    typeof tr.summary === 'string' && tr.summary.length > 0
      ? tr.summary
      : setup ?? '(no summary)'
  const status = typeof tr.status === 'string' ? tr.status : 'n/a'
  const files = Array.isArray(tr.files) ? tr.files.length : 0
  const out: { summary: string; status: string; fileEditCount: number; setupError?: string } = {
    summary: summary.slice(0, 200),
    status,
    fileEditCount: files,
  }
  if (setup !== undefined) out.setupError = setup
  return out
}

const collectArtifacts = async (
  dir: string,
  runIdFilter: string | undefined,
): Promise<ArtifactRow[]> => {
  const entries = await readdir(dir)
  const matches = entries.filter((n) => ARTIFACT_FILENAME.test(n) && n.endsWith('.json'))
  const rows: ArtifactRow[] = []
  for (const name of matches) {
    const full = join(dir, name)
    const raw = JSON.parse(await readFile(full, 'utf8')) as RawArtifact
    if (runIdFilter !== undefined && raw.ids?.runId !== runIdFilter) continue
    const detail = summaryOfRow(raw)
    const diffPaths =
      Array.isArray(raw.taskResult?.files)
        ? raw.taskResult.files
            .map((f) => (typeof f.path === 'string' ? f.path : null))
            .filter((p): p is string => p !== null)
            .slice(0, 8)
        : undefined
    rows.push({
      file: name,
      index: indexFromArtifact(raw),
      providerId: raw.ids?.providerId ?? 'unknown',
      phase: raw.phase ?? 'unknown',
      capturedAt: raw.capturedAt ?? '',
      summary: detail.summary,
      status: detail.status,
      fileEditCount: detail.fileEditCount,
      ...(detail.setupError !== undefined ? { setupError: detail.setupError } : {}),
      ...(diffPaths !== undefined && diffPaths.length > 0 ? { diffPaths } : {}),
    })
  }
  rows.sort((a, b) => (a.index - b.index) || a.capturedAt.localeCompare(b.capturedAt))
  return rows
}

const renderText = (rows: readonly ArtifactRow[], runId: string | undefined): string => {
  if (rows.length === 0) {
    return `explain: no coding-run-artifact-*.json found${runId ? ` for runId="${runId}"` : ''}\n`
  }
  const header = runId ? `Run ${runId} — ${rows.length} step(s):` : `${rows.length} step(s):`
  const lines = rows.map(
    (r, i) =>
      `  ${(i + 1).toString().padStart(2)}. [${r.phase}] ${r.providerId} → ${phaseLabel(r.phase, r.status, r.setupError)}` +
      `\n      ${r.summary}` +
      (r.fileEditCount > 0 ? `\n      ${r.fileEditCount} file edit(s)` : '') +
      (r.diffPaths !== undefined ? `\n      paths: ${r.diffPaths.join(', ')}` : ''),
  )
  return `${header}\n${lines.join('\n')}\n`
}

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('explain')
    .description(
      'Explain a coding run by walking the persisted run-artifact bundle (#224, reads #367 artifacts).',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption(
      '--artifact-dir <path>',
      'directory containing coding-run-artifact-*.json bundles (the value passed to --capture-run-artifacts)',
    )
    .option('--run-id <id>', 'filter to a specific run id captured in the artifacts')
    .option('--json', 'emit the structured step list instead of plain text', false)
    .action(async (opts: ExplainOpts) => {
      const dir = resolve(opts.artifactDir)
      let rows: readonly ArtifactRow[]
      try {
        rows = await collectArtifacts(dir, opts.runId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        result.current = { code: 2, stdout: '', stderr: `explain: ${msg}\n` }
        return
      }
      if (opts.json === true) {
        result.current = { code: 0, stdout: `${JSON.stringify(rows, null, 2)}\n`, stderr: '' }
        return
      }
      const text = renderText(rows, opts.runId)
      result.current = { code: rows.length === 0 ? 1 : 0, stdout: text, stderr: '' }
    })

  return { program, result }
}

export const explainRun: CliCommand = {
  name: 'explain',
  summary: 'Explain a coding run from its persisted run-artifact bundle',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
