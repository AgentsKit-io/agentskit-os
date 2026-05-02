import { resolve, basename, dirname, join } from 'node:path'
import { stringify as yamlStringify } from 'yaml'
import {
  parseConfigRoot,
  CONFIG_ROOT_VERSION,
  type ConfigRoot,
} from '@agentskit/os-core/schema/config-root'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os init [<dir>] [--id <slug>] [--name <name>] [--force]

Scaffolds a new AgentsKitOS workspace.

Creates:
  <dir>/agentskit-os.config.yaml   minimal valid ConfigRoot
  <dir>/.agentskitos/.gitkeep      runtime data dir (vault, traces, sqlite)
  <dir>/.gitignore                 if missing — adds .agentskitos/ + .env*

Defaults:
  <dir>     current working directory
  --id      basename(<dir>) lowercased + slugified (fallback "workspace")
  --name    basename(<dir>) (fallback "Workspace")

Exit codes: 0 ok, 2 usage error, 4 file already exists (use --force to overwrite).
`

const slugify = (input: string): string => {
  const base = input.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-')
  const trimmed = base.replace(/^-+|-+$/g, '')
  return trimmed.length > 0 ? trimmed.slice(0, 64) : 'workspace'
}

type InitArgs = {
  dir?: string
  id?: string
  name?: string
  force: boolean
  usage?: string
}

const parseArgs = (argv: readonly string[]): InitArgs => {
  const out: InitArgs = { force: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--force') {
      out.force = true
      i++
      continue
    }
    if (a === '--id' || a === '--name') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--id') out.id = v
      else out.name = v
      i += 2
      continue
    }
    if (a?.startsWith('--')) return { ...out, usage: `unknown flag "${a}"` }
    if (out.dir !== undefined) return { ...out, usage: 'only one positional <dir> argument allowed' }
    if (a !== undefined) out.dir = a
    i++
  }
  return out
}

const buildConfig = (id: string, name: string): ConfigRoot =>
  parseConfigRoot({
    schemaVersion: CONFIG_ROOT_VERSION,
    workspace: { schemaVersion: CONFIG_ROOT_VERSION, id, name },
    vault: { backend: 'os-keychain' },
    security: {},
    observability: {},
  })

export const init: CliCommand = {
  name: 'init',
  summary: 'Scaffold a new AgentsKitOS workspace',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    const baseDir = resolve(io.cwd(), args.dir ?? '.')
    const baseName = basename(baseDir)
    const id = slugify(args.id ?? baseName)
    const name = args.name ?? (baseName.length > 0 ? baseName : 'Workspace')

    const configPath = join(baseDir, 'agentskit-os.config.yaml')
    const dataDir = join(baseDir, '.agentskitos')
    const gitkeep = join(dataDir, '.gitkeep')
    const gitignore = join(baseDir, '.gitignore')

    if (!args.force && (await io.exists(configPath))) {
      return {
        code: 4,
        stdout: '',
        stderr: `error: ${configPath} already exists. Use --force to overwrite.\n`,
      }
    }

    const config = buildConfig(id, name)
    const yaml = `# AgentsKitOS workspace config (schemaVersion ${CONFIG_ROOT_VERSION})\n# See https://github.com/AgentsKit-io/agentskit-os\n\n${yamlStringify(config)}`

    await io.mkdir(dirname(configPath))
    await io.writeFile(configPath, yaml)
    await io.mkdir(dataDir)
    await io.writeFile(gitkeep, '')

    let gitignoreCreated = false
    if (!(await io.exists(gitignore))) {
      await io.writeFile(
        gitignore,
        '.agentskitos/\n.env\n.env.*\n!.env.example\nnode_modules/\n',
      )
      gitignoreCreated = true
    }

    const lines = [
      `created ${configPath}`,
      `created ${gitkeep}`,
      ...(gitignoreCreated ? [`created ${gitignore}`] : []),
      ``,
      `Workspace "${name}" (id: ${id}) initialized.`,
      `Next:  agentskit-os config validate ${configPath}`,
    ]
    return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
  },
}
