import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { Command } from 'commander'
import {
  applyBump,
  diffSnapshots,
  hashSnapshot,
  parseAgentsManifest,
  suggestBump,
  type AgentVersion as AgentVersionT,
  type AgentVersionSnapshot,
  type AgentsManifest,
  type BumpKind,
  type Hasher,
} from '@agentskit/os-core'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os agent <subcommand>

Subcommands:
  agent bump --id <slug> [--major|--minor|--patch|--auto] [--note <text>]
            [--snapshot <path>] [--workspace-root <path>]

  agent diff --id <slug> [--from <semver>] [--to <semver>]
            [--workspace-root <path>] [--json]

  agent version-list --id <slug> [--workspace-root <path>] [--json]

Manages agents.json (the per-workspace version manifest) and per-agent
content hashes.
`

const sha256: Hasher = (input: string) => createHash('sha256').update(input).digest('hex')

type CommonArgs = { workspaceRoot: string }

const manifestPath = (root: string) => `${root}/agents.json`

const loadManifest = async (io: CliIo, path: string): Promise<AgentsManifest> => {
  if (!(await io.exists(path))) {
    return { schemaVersion: 1, agents: {} }
  }
  const raw = await io.readFile(path)
  return parseAgentsManifest(JSON.parse(raw))
}

const saveManifest = async (io: CliIo, path: string, m: AgentsManifest): Promise<void> => {
  const dir = path.slice(0, path.lastIndexOf('/'))
  if (dir) await io.mkdir(dir)
  await io.writeFile(path, `${JSON.stringify(m, null, 2)}\n`)
}

// ---- bump --------------------------------------------------------------

type BumpArgs = CommonArgs & {
  id: string
  kind: BumpKind | 'auto'
  snapshotPath: string
  note?: string
}

const minimumSemver = '0.1.0'

const executeBump = async (args: BumpArgs, io: CliIo): Promise<CliExit> => {
  const root = resolve(io.cwd(), args.workspaceRoot)
  const path = manifestPath(root)
  const manifest = await loadManifest(io, path)
  const history = manifest.agents[args.id] ?? []
  const prev = history[history.length - 1]

  const snapRaw = await io.readFile(resolve(io.cwd(), args.snapshotPath))
  const nextSnap = JSON.parse(snapRaw) as AgentVersionSnapshot
  const nextHash = hashSnapshot(nextSnap, sha256)

  let kind: BumpKind
  let prevSnap: AgentVersionSnapshot | undefined
  if (!prev) {
    kind = 'patch'
    prevSnap = undefined
  } else {
    prevSnap = prev.snapshot
    const suggested = suggestBump(prev.snapshot, nextSnap, sha256)
    if (suggested === 'none') {
      return {
        code: 0,
        stdout: `no change since ${prev.semver} (hash=${prev.contentHash})\n`,
        stderr: '',
      }
    }
    kind = args.kind === 'auto' ? suggested : args.kind
  }

  const baseSemver = prev?.semver ?? minimumSemver
  const nextSemver = prev ? applyBump(baseSemver, kind) : minimumSemver

  const version: AgentVersionT = {
    agentId: args.id,
    semver: nextSemver,
    contentHash: nextHash,
    snapshot: nextSnap,
    at: new Date().toISOString(),
    ...(args.note ? { note: args.note } : {}),
  }
  const updated: AgentsManifest = {
    schemaVersion: 1,
    agents: {
      ...manifest.agents,
      [args.id]: [...history, version],
    },
  }
  await saveManifest(io, path, updated)

  const summary = prevSnap
    ? `${prev!.semver} → ${nextSemver} (${kind})`
    : `${nextSemver} (initial)`
  return {
    code: 0,
    stdout: `bumped ${args.id} ${summary}\nhash: ${nextHash}\n`,
    stderr: '',
  }
}

type BumpCliOpts = {
  id?: string
  snapshot?: string
  workspaceRoot?: string
  note?: string
  major?: boolean
  minor?: boolean
  patch?: boolean
}

const buildBumpProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('agent bump')
    .description('agentskit-os agent bump — Mint a new agent version (auto-suggest, manual confirm).')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption('--id <slug>', 'agent id')
    .requiredOption('--snapshot <path>', 'path to snapshot JSON')
    .option(
      '--workspace-root <path>',
      'workspace runtime root',
      '.agentskitos/workspaces/default',
    )
    .option('--note <text>', 'optional note stored on the version')
    .option('--major', 'force major semver bump', false)
    .option('--minor', 'force minor semver bump', false)
    .option('--patch', 'force patch semver bump', false)
    .action(async function (this: Command, opts: BumpCliOpts) {
      const flags: BumpKind[] = []
      if (opts.major) flags.push('major')
      if (opts.minor) flags.push('minor')
      if (opts.patch) flags.push('patch')
      if (flags.length > 1) {
        this.error('error: specify at most one of --major, --minor, --patch', { exitCode: 2 })
      }
      const kind: BumpKind | 'auto' = flags.length === 1 ? flags[0]! : 'auto'

      const args: BumpArgs = {
        workspaceRoot: opts.workspaceRoot ?? '.agentskitos/workspaces/default',
        id: opts.id!,
        snapshotPath: opts.snapshot!,
        kind,
        ...(opts.note !== undefined ? { note: opts.note } : {}),
      }
      result.current = await executeBump(args, io)
    })

  return { program, result }
}

export const agentBump: CliCommand = {
  name: 'agent bump',
  summary: 'Mint a new agent version (auto-suggest, manual confirm)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildBumpProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}

// ---- diff --------------------------------------------------------------

type DiffArgs = CommonArgs & {
  id: string
  from?: string
  to?: string
  json: boolean
}

const executeDiff = async (args: DiffArgs, io: CliIo): Promise<CliExit> => {
  const root = resolve(io.cwd(), args.workspaceRoot)
  const manifest = await loadManifest(io, manifestPath(root))
  const history = manifest.agents[args.id] ?? []
  if (history.length < 2 && !args.from) {
    return { code: 0, stdout: '(insufficient history to diff)\n', stderr: '' }
  }
  const find = (sv: string | undefined, fallbackIdx: number) =>
    sv ? history.find((v) => v.semver === sv) : history[fallbackIdx]
  const prev = find(args.from, history.length - 2)
  const next = find(args.to, history.length - 1)
  if (!prev || !next) {
    return { code: 8, stdout: '', stderr: `error: requested versions not found in history\n` }
  }
  const d = diffSnapshots(prev.snapshot, next.snapshot)
  if (args.json) {
    return { code: 0, stdout: `${JSON.stringify({ from: prev.semver, to: next.semver, diff: d })}\n`, stderr: '' }
  }
  const lines = [
    `${args.id}: ${prev.semver} → ${next.semver}`,
    `  prompt: ${d.prompt}`,
    `  model: ${d.model}`,
    `  tools: +${d.tools.added.length} -${d.tools.removed.length}`,
    `  dependencies: +${d.dependencies.added.length} -${d.dependencies.removed.length}`,
    `  capabilities: +${d.capabilities.added.length} -${d.capabilities.removed.length}`,
    `  lifecycleState: ${d.lifecycleState}`,
    `  riskTier: ${d.riskTier}`,
  ]
  return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
}

type DiffCliOpts = {
  id?: string
  from?: string
  to?: string
  workspaceRoot?: string
  json?: boolean
}

const buildDiffProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('agent diff')
    .description('agentskit-os agent diff — Diff two agent versions (defaults to last two).')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption('--id <slug>', 'agent id')
    .option('--from <semver>', 'from version (default: second-to-last)')
    .option('--to <semver>', 'to version (default: latest)')
    .option(
      '--workspace-root <path>',
      'workspace runtime root',
      '.agentskitos/workspaces/default',
    )
    .option('--json', 'emit JSON diff', false)
    .action(async (opts: DiffCliOpts) => {
      const args: DiffArgs = {
        id: opts.id!,
        workspaceRoot: opts.workspaceRoot ?? '.agentskitos/workspaces/default',
        json: opts.json === true,
        ...(opts.from !== undefined ? { from: opts.from } : {}),
        ...(opts.to !== undefined ? { to: opts.to } : {}),
      }
      result.current = await executeDiff(args, io)
    })

  return { program, result }
}

export const agentDiff: CliCommand = {
  name: 'agent diff',
  summary: 'Diff two agent versions (defaults to last two)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildDiffProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}

// ---- version-list ------------------------------------------------------

type VlArgs = CommonArgs & { id: string; json: boolean }

const executeVersionList = async (args: VlArgs, io: CliIo): Promise<CliExit> => {
  const root = resolve(io.cwd(), args.workspaceRoot)
  const manifest = await loadManifest(io, manifestPath(root))
  const history = manifest.agents[args.id] ?? []
  if (args.json) return { code: 0, stdout: `${JSON.stringify(history)}\n`, stderr: '' }
  if (history.length === 0) return { code: 0, stdout: '(no versions)\n', stderr: '' }
  const lines = history.map(
    (v) => `${v.semver.padEnd(12)} ${v.contentHash}  ${v.at}${v.note ? `  — ${v.note}` : ''}`,
  )
  return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
}

type VlCliOpts = {
  id?: string
  workspaceRoot?: string
  json?: boolean
}

const buildVersionListProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('agent version-list')
    .description('agentskit-os agent version-list — List version history for an agent.')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption('--id <slug>', 'agent id')
    .option(
      '--workspace-root <path>',
      'workspace runtime root',
      '.agentskitos/workspaces/default',
    )
    .option('--json', 'emit JSON array', false)
    .action(async (opts: VlCliOpts) => {
      const args: VlArgs = {
        id: opts.id!,
        workspaceRoot: opts.workspaceRoot ?? '.agentskitos/workspaces/default',
        json: opts.json === true,
      }
      result.current = await executeVersionList(args, io)
    })

  return { program, result }
}

export const agentVersionList: CliCommand = {
  name: 'agent version-list',
  summary: 'List version history for an agent',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildVersionListProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
