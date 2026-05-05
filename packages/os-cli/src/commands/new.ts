import { resolve, basename, dirname, join } from 'node:path'
import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import {
  CONFIG_ROOT_VERSION,
  parseConfigRoot,
  type ConfigRoot,
} from '@agentskit/os-core/schema/config-root'
import {
  builtInTemplates,
  findTemplate,
  listTemplates,
  type Template,
} from '@agentskit/os-templates'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os new [<template-id>] [<dir>] [--list] [--id <slug>] [--name <name>] [--force]

Scaffolds a new AgentsKitOS workspace from a starter template.

Flags:
  <template-id>    template id (omit + use --list to browse)
  <dir>            target directory (default: cwd)
  --list           list available templates and exit
  --id <slug>      override workspace id
  --name <name>    override workspace name
  --force          overwrite existing config

Exit codes:
  0  scaffolded
  2  usage / unknown template
  4  file exists (use --force)
`

const slugify = (input: string): string => {
  const base = input.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-')
  const trimmed = base.replace(/^-+|-+$/g, '')
  return trimmed.length > 0 ? trimmed.slice(0, 64) : 'workspace'
}

type Args = {
  templateId: string | undefined
  dir: string | undefined
  list: boolean
  id: string | undefined
  name: string | undefined
  force: boolean
}

const formatTemplateRow = (t: Template): string =>
  `  ${t.id.padEnd(28)} [${t.category.padEnd(11)}] ${t.difficulty.padEnd(13)} ${t.description}`

const buildConfig = (
  template: Template,
  idOverride: string | undefined,
  nameOverride: string | undefined,
): ConfigRoot => {
  let id = template.id
  if (idOverride !== undefined) id = idOverride
  let name = template.name
  if (nameOverride !== undefined) name = nameOverride
  return parseConfigRoot({
    schemaVersion: CONFIG_ROOT_VERSION,
    workspace: {
      schemaVersion: CONFIG_ROOT_VERSION,
      id: slugify(id),
      name,
      tags: [...template.tags],
    },
    vault: { backend: 'os-keychain' },
    security: {},
    observability: {},
    agents: template.agents,
    flows: template.flows,
  })
}

const executeNew = async (args: Args, io: CliIo): Promise<CliExit> => {
  if (args.list || (!args.templateId && !args.dir)) {
    const lines = listTemplates({}).map(formatTemplateRow)
    return {
      code: args.list ? 0 : 2,
      stdout: args.list
        ? `${builtInTemplates.length} templates available:\n${lines.join('\n')}\n`
        : '',
      stderr: args.list
        ? ''
        : `error: missing template id\n\n${builtInTemplates.length} templates available:\n${lines.join('\n')}\n\n${help}`,
    }
  }

  const template = args.templateId ? findTemplate(args.templateId) : undefined
  if (!template) {
    const ids = builtInTemplates.map((t) => t.id).join(', ')
    return {
      code: 2,
      stdout: '',
      stderr: `error: unknown template "${args.templateId}" (have: ${ids})\n`,
    }
  }

  const baseDir = resolve(io.cwd(), args.dir ?? '.')
  const baseName = basename(baseDir)
  let idOverride = args.id
  if (idOverride === undefined && args.dir) idOverride = slugify(baseName)
  const config = buildConfig(template, idOverride, args.name)

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

  const yaml = `# AgentsKitOS workspace scaffolded from "${template.id}" (v${template.version})\n# Description: ${template.description}\n\n${yamlStringify(JSON.parse(JSON.stringify(config)))}`

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

  const summary = [
    `created ${configPath}`,
    `created ${gitkeep}`,
    ...(gitignoreCreated ? [`created ${gitignore}`] : []),
    ``,
    `Template: ${template.name} (${template.id} v${template.version})`,
    `Workspace: ${config.workspace.name} (${config.workspace.id})`,
    `Agents: ${template.agents.length}, Flows: ${template.flows.length}`,
    ``,
    `Next:  agentskit-os config validate ${configPath}`,
    `       agentskit-os run ${configPath} --flow ${template.flows[0]?.id ?? '<id>'}`,
  ].join('\n')

  return { code: 0, stdout: `${summary}\n`, stderr: '' }
}

type NewCliOpts = {
  list: boolean | undefined
  id: string | undefined
  name: string | undefined
  force: boolean | undefined
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('new')
    .description('agentskit-os new — Scaffold workspace from a starter template (--list to browse).')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('[templateId]', 'starter template id')
    .argument('[dir]', 'target directory')
    .option('--list', 'list available templates and exit', false)
    .option('--id <slug>', 'override workspace id')
    .option('--name <name>', 'override workspace name')
    .option('--force', 'overwrite existing config', false)
    .action(async (templateId: string | undefined, dir: string | undefined, opts: NewCliOpts) => {
      const args: Args = {
        list: opts.list === true,
        force: opts.force === true,
        templateId,
        dir,
        id: opts.id,
        name: opts.name,
      }
      result.current = await executeNew(args, io)
    })

  return { program, result }
}

export const newCmd: CliCommand = {
  name: 'new',
  summary: 'Scaffold workspace from a starter template (--list to browse)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
