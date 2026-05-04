import { resolve } from 'node:path'
import { Command, Option } from 'commander'
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import {
  CONFIG_ROOT_VERSION,
  parseConfigRoot,
  type ConfigRoot,
} from '@agentskit/os-core/schema/config-root'
import { findTemplate, listTemplates } from '@agentskit/os-templates'
import { runCommander } from '../cli/commander-dispatch.js'
import { templateListToInkString } from './flow-new-list-ink.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

type Persona = 'dev' | 'agency' | 'clinical' | 'non-tech'

const personaSuggestions: Record<Persona, readonly string[]> = {
  dev: ['dev-pr-review', 'dev-bug-fix', 'dev-code-review', 'dev-refactor', 'dev-eval', 'pr-review', 'compose-nested'],
  agency: ['marketing-3way', 'compare-models', 'vote-majority', 'parallel-fanout'],
  clinical: ['clinical-consensus', 'vote-majority', 'debate-pro-con', 'condition-triage'],
  'non-tech': ['support-triage', 'condition-triage', 'linear-doc-summarize'],
}

type FlowNewOpts = {
  list: boolean
  persona?: Persona
  target: string
  flowId?: string
  estimate: boolean
  replace: boolean
}

const sortedAgents = <T extends { id: string }>(arr: readonly T[]): T[] =>
  [...arr].sort((a, b) => a.id.localeCompare(b.id))

const buildListRows = (persona?: Persona) => {
  const all = listTemplates()
  const pool =
    persona === undefined
      ? all
      : [
          ...personaSuggestions[persona]
            .map((id) => all.find((t) => t.id === id))
            .filter((t): t is NonNullable<typeof t> => !!t),
          ...all.filter((t) => !personaSuggestions[persona].includes(t.id)),
        ]
  return pool.map((t) => ({
    id: t.id,
    category: t.category,
    difficulty: t.difficulty,
    name: t.name,
  }))
}

const runList = (persona?: Persona): CliExit => ({
  code: 0,
  stdout: templateListToInkString(buildListRows(persona)),
  stderr: '',
})

const mergeFlowIntoConfig = (
  cfg: ConfigRoot,
  templateId: string,
  flowIdArg: string | undefined,
  replace: boolean,
): { ok: true; merged: ConfigRoot; flowId: string } | { ok: false; exit: CliExit } => {
  const template = findTemplate(templateId)
  if (!template) {
    return { ok: false, exit: { code: 8, stdout: '', stderr: `error: template "${templateId}" not found. Use --list.\n` } }
  }
  const incomingFlow = template.flows[0]
  if (!incomingFlow) {
    return { ok: false, exit: { code: 8, stdout: '', stderr: `error: template "${templateId}" has no flow\n` } }
  }
  const flowId = flowIdArg ?? incomingFlow.id
  const flows = [...(cfg.flows ?? [])]
  const idx = flows.findIndex((f) => f.id === flowId)
  if (idx !== -1 && !replace) {
    return {
      ok: false,
      exit: { code: 4, stdout: '', stderr: `error: flow "${flowId}" already exists. Use --replace.\n` },
    }
  }
  const incoming = { ...incomingFlow, id: flowId }
  if (idx === -1) flows.push(incoming)
  else flows[idx] = incoming

  const agents = sortedAgents([
    ...(cfg.agents ?? []),
    ...template.agents.filter((a) => !(cfg.agents ?? []).some((existing) => existing.id === a.id)),
  ])

  const merged = parseConfigRoot({
    ...cfg,
    schemaVersion: CONFIG_ROOT_VERSION,
    agents,
    flows,
  })
  return { ok: true, merged, flowId }
}

const runScaffold = async (
  templateId: string,
  opts: FlowNewOpts,
  io: CliIo,
): Promise<CliExit> => {
  const targetPath = resolve(io.cwd(), opts.target)
  if (!(await io.exists(targetPath))) {
    return {
      code: 8,
      stdout: '',
      stderr: `error: target config ${targetPath} not found. Run \`agentskit-os init\` first.\n`,
    }
  }
  const cfg = parseConfigRoot(yamlParse(await io.readFile(targetPath)))
  const mergedResult = mergeFlowIntoConfig(cfg, templateId, opts.flowId, opts.replace)
  if (!mergedResult.ok) {
    return mergedResult.exit
  }
  const { merged, flowId } = mergedResult
  await io.writeFile(targetPath, yamlStringify(merged))
  const lines = [
    `scaffolded flow "${flowId}" from template "${templateId}"`,
    `target: ${targetPath}`,
    ...(opts.estimate
      ? [`hint: run \`agentskit-os run ${opts.target} --flow ${flowId} --estimate\` to smoke check`]
      : []),
  ]
  return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('flow new')
    .description('Scaffold a new flow from a built-in template into an existing workspace config.')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('[template-id]', 'built-in template id (see --list)')
    .option('--list', 'list templates and exit', false)
    .addOption(
      new Option('--persona <p>', 'when using --list: order / highlight templates for a persona').choices([
        'dev',
        'agency',
        'clinical',
        'non-tech',
      ]),
    )
    .option('--target <path>', 'config file to merge into', 'agentskit-os.config.yaml')
    .option('--flow-id <slug>', 'override scaffolded flow id')
    .option('--estimate', 'print hint to run cost estimate', false)
    .option('--replace', 'replace existing flow with the same id', false)
    .action(async (templateId: string | undefined, options: FlowNewOpts) => {
      if (options.list) {
        result.current = runList(options.persona)
        return
      }
      if (templateId === undefined || templateId === '') {
        program.error('error: missing <template-id> (use --list to browse)', { exitCode: 2 })
      } else {
        result.current = await runScaffold(templateId, options, io)
      }
    })

  return { program, result }
}

export const flowNew: CliCommand = {
  name: 'flow new',
  summary: 'Scaffold a new flow from a built-in template',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
