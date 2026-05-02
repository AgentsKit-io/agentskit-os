import { resolve, dirname } from 'node:path'
import { stringify as yamlStringify } from 'yaml'
import {
  CONFIG_ROOT_VERSION,
  parseConfigRoot,
  type ConfigRoot,
} from '@agentskit/os-core/schema/config-root'
import {
  builtInImporters,
  detectImporter,
  importWorkflow,
  type ImportResult,
} from '@agentskit/os-import'
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
  input?: string
  out?: string
  source?: string
  workspace?: string
  quiet: boolean
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { quiet: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--quiet') {
      out.quiet = true
      i++
      continue
    }
    if (a === '--out' || a === '--source' || a === '--workspace') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--out') out.out = v
      else if (a === '--source') out.source = v
      else out.workspace = v
      i += 2
      continue
    }
    if (a?.startsWith('--')) return { ...out, usage: `unknown flag "${a}"` }
    if (out.input !== undefined) return { ...out, usage: 'only one positional <input-path> allowed' }
    if (a !== undefined) out.input = a
    i++
  }
  return out
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

export const importCmd: CliCommand = {
  name: 'import',
  summary: 'Translate n8n / Langflow / Dify workflow JSON into AgentsKitOS config',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }
    if (!args.input) return { code: 2, stdout: '', stderr: help }

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
  },
}
