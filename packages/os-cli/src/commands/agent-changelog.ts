import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import {
  parseAgentsManifest,
  renderManifestChangelogs,
  type AgentsManifest,
  type GitCommitResolver,
  type Hasher,
} from '@agentskit/os-core'
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
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { workspaceRoot: '.agentskitos/workspaces/default', ids: [], json: false, noGit: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--json') { out.json = true; i++; continue }
    if (a === '--no-git') { out.noGit = true; i++; continue }
    if (a === '--workspace-root' || a === '--id' || a === '--git-tag-prefix') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--workspace-root') out.workspaceRoot = v
      else if (a === '--id') out.ids.push(v)
      else out.gitTagPrefix = v
      i += 2
      continue
    }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  return out
}

const filterManifest = (m: AgentsManifest, ids: readonly string[]): AgentsManifest => {
  if (ids.length === 0) return m
  const keep = new Set(ids)
  const out: AgentsManifest['agents'] = {}
  for (const [id, versions] of Object.entries(m.agents)) {
    if (keep.has(id)) out[id] = versions
  }
  return { schemaVersion: 1, agents: out }
}

export const agentChangelog: CliCommand = {
  name: 'agent changelog',
  summary: 'Generate per-agent CHANGELOG.md files from agents.json',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

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
          // Caller may inject a richer resolver; default heuristic just
          // returns undefined. Wired here for forward-compat.
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
  },
}
