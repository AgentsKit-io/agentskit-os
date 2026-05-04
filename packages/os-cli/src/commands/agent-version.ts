import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
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

type SubKind = 'bump' | 'diff' | 'version-list'

type CommonArgs = { workspaceRoot: string; usage?: string }

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
  id?: string
  kind: BumpKind | 'auto'
  snapshotPath?: string
  note?: string
}

const parseBump = (argv: readonly string[]): BumpArgs => {
  const out: BumpArgs = { workspaceRoot: '.agentskitos/workspaces/default', kind: 'auto' }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--major') { out.kind = 'major'; i++; continue }
    if (a === '--minor') { out.kind = 'minor'; i++; continue }
    if (a === '--patch') { out.kind = 'patch'; i++; continue }
    if (a === '--auto') { out.kind = 'auto'; i++; continue }
    if (a === '--id' || a === '--snapshot' || a === '--note' || a === '--workspace-root') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--id') out.id = v
      else if (a === '--snapshot') out.snapshotPath = v
      else if (a === '--note') out.note = v
      else out.workspaceRoot = v
      i += 2
      continue
    }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  if (!out.id) return { ...out, usage: '--id is required' }
  if (!out.snapshotPath) return { ...out, usage: '--snapshot <path> is required' }
  return out
}

const minimumSemver = '0.1.0'

export const agentBump: CliCommand = {
  name: 'agent bump',
  summary: 'Mint a new agent version (auto-suggest, manual confirm)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseBump(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    const root = resolve(io.cwd(), args.workspaceRoot)
    const path = manifestPath(root)
    const manifest = await loadManifest(io, path)
    const history = manifest.agents[args.id!] ?? []
    const prev = history[history.length - 1]

    const snapRaw = await io.readFile(resolve(io.cwd(), args.snapshotPath!))
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
      agentId: args.id!,
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
        [args.id!]: [...history, version],
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
  },
}

// ---- diff --------------------------------------------------------------

type DiffArgs = CommonArgs & {
  id?: string
  from?: string
  to?: string
  json: boolean
}

const parseDiff = (argv: readonly string[]): DiffArgs => {
  const out: DiffArgs = { workspaceRoot: '.agentskitos/workspaces/default', json: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--json') { out.json = true; i++; continue }
    if (a === '--id' || a === '--from' || a === '--to' || a === '--workspace-root') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--id') out.id = v
      else if (a === '--from') out.from = v
      else if (a === '--to') out.to = v
      else out.workspaceRoot = v
      i += 2
      continue
    }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  if (!out.id) return { ...out, usage: '--id is required' }
  return out
}

export const agentDiff: CliCommand = {
  name: 'agent diff',
  summary: 'Diff two agent versions (defaults to last two)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseDiff(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    const root = resolve(io.cwd(), args.workspaceRoot)
    const manifest = await loadManifest(io, manifestPath(root))
    const history = manifest.agents[args.id!] ?? []
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
  },
}

// ---- version-list ------------------------------------------------------

type VlArgs = CommonArgs & { id?: string; json: boolean }

const parseVl = (argv: readonly string[]): VlArgs => {
  const out: VlArgs = { workspaceRoot: '.agentskitos/workspaces/default', json: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--json') { out.json = true; i++; continue }
    if (a === '--id' || a === '--workspace-root') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--id') out.id = v
      else out.workspaceRoot = v
      i += 2
      continue
    }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  if (!out.id) return { ...out, usage: '--id is required' }
  return out
}

export const agentVersionList: CliCommand = {
  name: 'agent version-list',
  summary: 'List version history for an agent',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseVl(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    const root = resolve(io.cwd(), args.workspaceRoot)
    const manifest = await loadManifest(io, manifestPath(root))
    const history = manifest.agents[args.id!] ?? []
    if (args.json) return { code: 0, stdout: `${JSON.stringify(history)}\n`, stderr: '' }
    if (history.length === 0) return { code: 0, stdout: '(no versions)\n', stderr: '' }
    const lines = history.map(
      (v) => `${v.semver.padEnd(12)} ${v.contentHash}  ${v.at}${v.note ? `  — ${v.note}` : ''}`,
    )
    return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
  },
}
