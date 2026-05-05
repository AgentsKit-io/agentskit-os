import { resolve, dirname } from 'node:path'
import { Command } from 'commander'
import { stringify as yamlStringify } from 'yaml'
import {
  CONFIG_ROOT_VERSION,
  parseConfigRoot,
  type ConfigRoot,
} from '@agentskit/os-core/schema/config-root'
import {
  builtInImporters,
  detectImporter,
  type ImportResult,
} from '@agentskit/os-import'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const help = `agentskit-os import <input-path> [...flags]

Translates a third-party workflow JSON (n8n / Langflow / Dify) into an
AgentsKitOS config file.

Flags:
  --out <path>     write the resulting agentskit-os.config.yaml to <path>
                   (default: print to stdout)
  --source <id>    force importer source instead of auto-detect
  --workspace <id> override workspace id from importer output
  --quiet          suppress warning summary

Exit codes:
  0  success (with or without warnings)
  1  parse / translation error
  2  usage error
  3  read error
`

type Args = {
  input: string
  out?: string
  source?: string
  workspace?: string
  quiet: boolean
}

const buildConfigRoot = (result: ImportResult, workspaceOverride?: string): ConfigRoot =>
  parseConfigRoot({
    schemaVersion: CONFIG_ROOT_VERSION,
    workspace: {
      schemaVersion: CONFIG_ROOT_VERSION,
      id: workspaceOverride ?? result.workspace.id,
      name: result.workspace.name,
    },
    vault: { backend: 'os-keychain' },
    security: {},
    observability: {},
    agents: result.agents,
    flows: result.flows,
  })

const executeImport = async (args: Args, io: CliIo): Promise<CliExit> => {
  const loaded = await loadConfigFile(io, args.input)
  if (!loaded.ok) return { code: loaded.code, stdout: '', stderr: loaded.message }

  let result: ImportResult
  try {
    if (args.source) {
      const importer = builtInImporters.find((i) => i.source === args.source)
      if (!importer) {
        return {
          code: 2,
          stdout: '',
          stderr: `error: unknown --source "${args.source}" (have: ${builtInImporters.map((i) => i.source).join(', ')})\n`,
        }
      }
      result = importer.parse(loaded.value)
    } else {
      const importer = detectImporter(loaded.value)
      if (!importer) {
        return {
          code: 1,
          stdout: '',
          stderr: `error: no importer matched ${loaded.absolutePath} (tried: ${builtInImporters.map((i) => i.source).join(', ')})\n`,
        }
      }
      result = importer.parse(loaded.value)
    }
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: import failed: ${(err as Error).message}\n`,
    }
  }

  let config: ConfigRoot
  try {
    config = buildConfigRoot(result, args.workspace)
  } catch (err) {
    return {
      code: 1,
      stdout: '',
      stderr: `error: imported workflow is not valid AgentsKitOS config: ${(err as Error).message}\n`,
    }
  }

  const yaml = `# AgentsKitOS config imported from ${result.source}\n# Source: ${loaded.absolutePath}\n\n${yamlStringify(JSON.parse(JSON.stringify(config)))}`

  const warningsSummary =
    result.warnings.length === 0 || args.quiet
      ? ''
      : `\n${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}:\n${result.warnings
          .map((w) => `  - ${w.code}: ${w.message}`)
          .join('\n')}\n`

  if (args.out) {
    const outPath = resolve(io.cwd(), args.out)
    await io.mkdir(dirname(outPath))
    await io.writeFile(outPath, yaml)
    return {
      code: 0,
      stdout: `wrote ${outPath} (source=${result.source}, workspace=${config.workspace.id}, agents=${result.agents.length}, flows=${result.flows.length})${warningsSummary}`,
      stderr: '',
    }
  }

  return {
    code: 0,
    stdout: `${yaml}${warningsSummary ? `\n---\n${warningsSummary}` : ''}`,
    stderr: '',
  }
}

type ImportCliOpts = {
  out?: string
  source?: string
  workspace?: string
  quiet?: boolean
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('import')
    .description(
      'agentskit-os import — Translate n8n / Langflow / Dify workflow JSON into AgentsKitOS config.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('<input>', 'path to workflow JSON')
    .option('--out <path>', 'write YAML to path instead of stdout')
    .option('--source <id>', 'force importer source')
    .option('--workspace <id>', 'override workspace id')
    .option('--quiet', 'suppress warning summary', false)
    .action(async (input: string, opts: ImportCliOpts) => {
      const args: Args = {
        input,
        quiet: opts.quiet === true,
        ...(opts.out !== undefined ? { out: opts.out } : {}),
        ...(opts.source !== undefined ? { source: opts.source } : {}),
        ...(opts.workspace !== undefined ? { workspace: opts.workspace } : {}),
      }
      result.current = await executeImport(args, io)
    })

  return { program, result }
}

export const importCmd: CliCommand = {
  name: 'import',
  summary: 'Translate n8n / Langflow / Dify workflow JSON into AgentsKitOS config',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
