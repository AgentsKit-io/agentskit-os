import { resolve } from 'node:path'
import {
  FLOW_ENVELOPE_FORMAT,
  parseFlowEnvelope,
  parseFlowConfig,
  type FlowConfig,
  type FlowEnvelope,
} from '@agentskit/os-core'
import {
  CONFIG_ROOT_VERSION,
  parseConfigRoot,
  type ConfigRoot,
} from '@agentskit/os-core/schema/config-root'
import { stringify as yamlStringify, parse as yamlParse } from 'yaml'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const exportHelp = `agentskit-os flow export <config-path> --flow <id> [--out <path>]

Exports a flow from an AgentsKitOS config file as a portable JSON envelope
(format "${FLOW_ENVELOPE_FORMAT}"). Pipe through ed25519/minisign and
attach the signature back via \`flow import-json --signature <path>\`.

Options:
  --flow <id>      flow id to extract (required)
  --out <path>     write JSON to <path> (default: stdout)
`

const importHelp = `agentskit-os flow import-json <envelope-path> --target <config-path> [options]

Imports a FlowEnvelope JSON into an existing AgentsKitOS config.

Options:
  --target <path>  config to mutate (required, must already exist)
  --mode <m>       merge | replace (default: merge — appends if id is new,
                   errors if id collides without --replace)
  --replace        shorthand for --mode replace
  --out <path>     write merged config to <path> (default: --target in-place)
`

const readYaml = async (io: CliIo, path: string): Promise<ConfigRoot> => {
  const raw = await io.readFile(path)
  return parseConfigRoot(yamlParse(raw))
}

const writeYaml = async (io: CliIo, path: string, cfg: ConfigRoot): Promise<void> => {
  await io.writeFile(path, yamlStringify(cfg))
}

// ---- export ------------------------------------------------------------

type ExportArgs = {
  config?: string
  flowId?: string
  out?: string
  usage?: string
}

const parseExport = (argv: readonly string[]): ExportArgs => {
  const out: ExportArgs = {}
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--flow' || a === '--out') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--flow') out.flowId = v
      else out.out = v
      i += 2
      continue
    }
    if (a?.startsWith('--')) return { ...out, usage: `unknown flag "${a}"` }
    if (out.config !== undefined) return { ...out, usage: 'only one positional <config-path>' }
    if (a !== undefined) out.config = a
    i++
  }
  if (!out.config) return { ...out, usage: '<config-path> is required' }
  if (!out.flowId) return { ...out, usage: '--flow <id> is required' }
  return out
}

export const flowExport: CliCommand = {
  name: 'flow export',
  summary: 'Export a flow as a portable FlowEnvelope JSON',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseExport(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: exportHelp }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${exportHelp}` }

    const cfgPath = resolve(io.cwd(), args.config!)
    const cfg = await readYaml(io, cfgPath)
    const flow = (cfg.flows ?? []).find((f) => f.id === args.flowId)
    if (!flow) {
      return { code: 8, stdout: '', stderr: `error: flow "${args.flowId}" not found in ${cfgPath}\n` }
    }
    const envelope: FlowEnvelope = {
      format: FLOW_ENVELOPE_FORMAT,
      flow,
      meta: { exportedAt: new Date().toISOString(), workspace: cfg.workspace.id },
    }
    const json = JSON.stringify(envelope, null, 2)
    if (args.out) {
      await io.writeFile(resolve(io.cwd(), args.out), json)
      return { code: 0, stdout: `exported ${args.flowId} → ${args.out}\n`, stderr: '' }
    }
    return { code: 0, stdout: `${json}\n`, stderr: '' }
  },
}

// ---- import-json -------------------------------------------------------

type ImportArgs = {
  envelope?: string
  target?: string
  mode: 'merge' | 'replace'
  out?: string
  usage?: string
}

const parseImport = (argv: readonly string[]): ImportArgs => {
  const out: ImportArgs = { mode: 'merge' }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--replace') { out.mode = 'replace'; i++; continue }
    if (a === '--target' || a === '--out' || a === '--mode') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--target') out.target = v
      else if (a === '--out') out.out = v
      else if (a === '--mode') {
        if (v !== 'merge' && v !== 'replace') return { ...out, usage: `--mode must be merge|replace` }
        out.mode = v
      }
      i += 2
      continue
    }
    if (a?.startsWith('--')) return { ...out, usage: `unknown flag "${a}"` }
    if (out.envelope !== undefined) return { ...out, usage: 'only one positional <envelope-path>' }
    if (a !== undefined) out.envelope = a
    i++
  }
  if (!out.envelope) return { ...out, usage: '<envelope-path> is required' }
  if (!out.target) return { ...out, usage: '--target <config-path> is required' }
  return out
}

const upsertFlow = (cfg: ConfigRoot, incoming: FlowConfig, mode: 'merge' | 'replace'): ConfigRoot => {
  const flows = [...(cfg.flows ?? [])]
  const idx = flows.findIndex((f) => f.id === incoming.id)
  if (idx === -1) {
    flows.push(incoming)
  } else if (mode === 'replace') {
    flows[idx] = incoming
  } else {
    throw new Error(`os.cli.import.flow_collision: flow id "${incoming.id}" already exists; use --replace`)
  }
  return parseConfigRoot({ ...cfg, schemaVersion: CONFIG_ROOT_VERSION, flows })
}

export const flowImportJson: CliCommand = {
  name: 'flow import-json',
  summary: 'Import a FlowEnvelope JSON into an existing config',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseImport(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: importHelp }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${importHelp}` }

    const envPath = resolve(io.cwd(), args.envelope!)
    const targetPath = resolve(io.cwd(), args.target!)
    const envelope = parseFlowEnvelope(JSON.parse(await io.readFile(envPath)))
    const flow = parseFlowConfig(envelope.flow)

    const cfg = await readYaml(io, targetPath)
    let merged: ConfigRoot
    try {
      merged = upsertFlow(cfg, flow, args.mode)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { code: 9, stdout: '', stderr: `error: ${msg}\n` }
    }
    const outPath = resolve(io.cwd(), args.out ?? args.target!)
    await writeYaml(io, outPath, merged)
    return {
      code: 0,
      stdout: `imported ${flow.id} (mode=${args.mode}) → ${outPath}\n`,
      stderr: '',
    }
  },
}
