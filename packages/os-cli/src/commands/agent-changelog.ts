import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { Command } from 'commander'
import {
  parseAgentsManifest,
  renderManifestChangelogs,
  type AgentsManifest,
  type GitCommitResolver,
  type Hasher,
} from '@agentskit/os-core'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os agent changelog [options]

Generates Conventional Commits / Keep-a-Changelog markdown for every
agent in the workspace's agents.json. One file per agent under
<workspace-root>/changelog/<agentId>.md. Regenerates from scratch.

Options:
  --workspace-root <path>  override the workspace runtime root
                            (defaults to ./.agentskitos/workspaces/default)
  --id <slug>              restrict to one agent (repeatable)
  --json                   emit JSON map of path -> contents instead of writing
  --git-tag-prefix <pfx>   prefix for git tag → commit lookup (e.g. "agent-")
  --no-git                 skip git commit resolution
`

const sha256: Hasher = (input: string) => createHash('sha256').update(input).digest('hex')

type Args = {
  workspaceRoot: string
  ids: string[]
  json: boolean
  gitTagPrefix?: string
  noGit: boolean
}

const collect = (value: string, previous: string[]): string[] => [...previous, value]

const filterManifest = (m: AgentsManifest, ids: readonly string[]): AgentsManifest => {
  if (ids.length === 0) return m
  const keep = new Set(ids)
  const out: AgentsManifest['agents'] = {}
  for (const [id, versions] of Object.entries(m.agents)) {
    if (keep.has(id)) out[id] = versions
  }
  return { schemaVersion: 1, agents: out }
}

const executeAgentChangelog = async (args: Args, io: CliIo): Promise<CliExit> => {
  const root = resolve(io.cwd(), args.workspaceRoot)
  const manifestPath = `${root}/agents.json`
  if (!(await io.exists(manifestPath))) {
    return { code: 8, stdout: '', stderr: `error: ${manifestPath} not found. Run \`agent bump\` first.\n` }
  }
  const raw = await io.readFile(manifestPath)
  const manifest = filterManifest(parseAgentsManifest(JSON.parse(raw)), args.ids)

  const gitResolver: GitCommitResolver | undefined = args.noGit
    ? undefined
    : (_hash, semver) => {
        if (!args.gitTagPrefix) return undefined
        return `${args.gitTagPrefix}${semver}`
      }

  const files = renderManifestChangelogs(
    manifest,
    sha256,
    gitResolver ? { gitResolver } : {},
  )

  if (args.json) {
    const obj: Record<string, string> = {}
    for (const [k, v] of files) obj[k] = v
    return { code: 0, stdout: `${JSON.stringify(obj)}\n`, stderr: '' }
  }

  let written = 0
  for (const [rel, contents] of files) {
    const path = `${root}/${rel}`
    const dir = path.slice(0, path.lastIndexOf('/'))
    await io.mkdir(dir)
    await io.writeFile(path, contents)
    written++
  }
  return {
    code: 0,
    stdout: `wrote ${written} changelog file(s) under ${root}/changelog/\n`,
    stderr: '',
  }
}

type ChangelogCliOpts = {
  workspaceRoot?: string
  id?: string[]
  json?: boolean
  gitTagPrefix?: string
  noGit?: boolean
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('agent changelog')
    .description(
      'agentskit-os agent changelog — Generate per-agent CHANGELOG.md files from agents.json.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .option(
      '--workspace-root <path>',
      'workspace runtime root',
      '.agentskitos/workspaces/default',
    )
    .option('--id <slug>', 'restrict to one agent (repeatable)', collect, [] as string[])
    .option('--json', 'emit JSON map instead of writing files', false)
    .option('--git-tag-prefix <pfx>', 'prefix for git tag → commit lookup')
    .option('--no-git', 'skip git commit resolution', false)
    .action(async (opts: ChangelogCliOpts) => {
      const args: Args = {
        workspaceRoot: opts.workspaceRoot ?? '.agentskitos/workspaces/default',
        ids: opts.id ?? [],
        json: opts.json === true,
        ...(opts.gitTagPrefix !== undefined ? { gitTagPrefix: opts.gitTagPrefix } : {}),
        noGit: opts.noGit === true,
      }
      result.current = await executeAgentChangelog(args, io)
    })

  return { program, result }
}

export const agentChangelog: CliCommand = {
  name: 'agent changelog',
  summary: 'Generate per-agent CHANGELOG.md files from agents.json',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
