import { resolve, basename, dirname, join } from 'node:path'
import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import {
  parseConfigRoot,
  CONFIG_ROOT_VERSION,
  type ConfigRoot,
} from '@agentskit/os-core/schema/config-root'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const slugify = (input: string): string => {
  const base = input.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-')
  const trimmed = base.replace(/^-+|-+$/g, '')
  return trimmed.length > 0 ? trimmed.slice(0, 64) : 'workspace'
}

const buildConfig = (id: string, name: string): ConfigRoot =>
  parseConfigRoot({
    schemaVersion: CONFIG_ROOT_VERSION,
    workspace: { schemaVersion: CONFIG_ROOT_VERSION, id, name },
    vault: { backend: 'os-keychain' },
    security: {},
    observability: {},
  })

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('init')
    .description(
      'agentskit-os init — Scaffold a new AgentsKitOS workspace (config + .agentskitos + .gitignore).',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('[dir]', 'target directory (default: current directory)', '.')
    .option('--id <slug>', 'workspace id (default: slugified directory name)')
    .option('--name <name>', 'workspace display name (default: directory basename)')
    .option('--force', 'overwrite existing agentskit-os.config.yaml', false)
    .action(async (dirArg: string, opts: { id: string | undefined; name: string | undefined; force: boolean | undefined }) => {
      const baseDir = resolve(io.cwd(), dirArg || '.')
      const baseName = basename(baseDir)
      let idInput = baseName
      if (opts.id) idInput = opts.id
      const id = slugify(idInput)
      let name = 'Workspace'
      if (baseName.length > 0) name = baseName
      if (opts.name) name = opts.name

      const configPath = join(baseDir, 'agentskit-os.config.yaml')
      const dataDir = join(baseDir, '.agentskitos')
      const gitkeep = join(dataDir, '.gitkeep')
      const gitignore = join(baseDir, '.gitignore')

      if (!opts.force && (await io.exists(configPath))) {
        result.current = {
          code: 4,
          stdout: '',
          stderr: `error: ${configPath} already exists. Use --force to overwrite.\n`,
        }
        return
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
      result.current = { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
    })

  return { program, result }
}

export const init: CliCommand = {
  name: 'init',
  summary: 'Scaffold a new AgentsKitOS workspace',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    if (result.current) return result.current
    return { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
