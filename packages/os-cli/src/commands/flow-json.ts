import { resolve } from 'node:path'
import { Command } from 'commander'
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
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const readYaml = async (io: CliIo, path: string): Promise<ConfigRoot> => {
  const raw = await io.readFile(path)
  return parseConfigRoot(yamlParse(raw))
}

const writeYaml = async (io: CliIo, path: string, cfg: ConfigRoot): Promise<void> => {
  await io.writeFile(path, yamlStringify(cfg))
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

const buildExportProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('flow export')
    .description(
      `agentskit-os flow export — Export a flow as portable JSON (${FLOW_ENVELOPE_FORMAT}).`,
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('<configPath>', 'AgentsKitOS workspace config path')
    .requiredOption('--flow <id>', 'flow id to extract')
    .option('--out <path>', 'write JSON to path (default: stdout)')
    .action(async (configPath: string, opts: { flow: string; out?: string }) => {
      const cfgPath = resolve(io.cwd(), configPath)
      const cfg = await readYaml(io, cfgPath)
      const flow = (cfg.flows ?? []).find((f) => f.id === opts.flow)
      if (!flow) {
        result.current = { code: 8, stdout: '', stderr: `error: flow "${opts.flow}" not found in ${cfgPath}\n` }
        return
      }
      const envelope: FlowEnvelope = {
        format: FLOW_ENVELOPE_FORMAT,
        flow,
        meta: { exportedAt: new Date().toISOString(), workspace: cfg.workspace.id },
      }
      const json = JSON.stringify(envelope, null, 2)
      if (opts.out) {
        await io.writeFile(resolve(io.cwd(), opts.out), json)
        result.current = { code: 0, stdout: `exported ${opts.flow} → ${opts.out}\n`, stderr: '' }
        return
      }
      result.current = { code: 0, stdout: `${json}\n`, stderr: '' }
    })
  return { program, result }
}

export const flowExport: CliCommand = {
  name: 'flow export',
  summary: 'Export a flow as a portable FlowEnvelope JSON',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildExportProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}

const buildImportProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('flow import-json')
    .description('agentskit-os flow import-json — Import a FlowEnvelope JSON into an existing config.')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('<envelopePath>', 'path to FlowEnvelope JSON')
    .requiredOption('--target <path>', 'config file to mutate (must exist)')
    .option('--mode <m>', 'merge or replace', 'merge')
    .option('--replace', 'shorthand for replace mode', false)
    .option('--out <path>', 'write merged config here (default: --target in-place)')
    .action(async function (this: Command, envelopePath: string, opts: {
      target: string
      mode?: string
      replace?: boolean
      out?: string
    }) {
      if (opts.mode !== undefined && opts.mode !== 'merge' && opts.mode !== 'replace') {
        this.error('error: --mode must be merge|replace', { exitCode: 2 })
      }
      let mode: 'merge' | 'replace' = 'merge'
      if (opts.replace) mode = 'replace'
      else if (opts.mode === 'replace') mode = 'replace'

      const envPath = resolve(io.cwd(), envelopePath)
      const targetPath = resolve(io.cwd(), opts.target)
      const envelope = parseFlowEnvelope(JSON.parse(await io.readFile(envPath)))
      const flow = parseFlowConfig(envelope.flow)

      const cfg = await readYaml(io, targetPath)
      let merged: ConfigRoot
      try {
        merged = upsertFlow(cfg, flow, mode)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        result.current = { code: 9, stdout: '', stderr: `error: ${msg}\n` }
        return
      }
      const outPath = resolve(io.cwd(), opts.out ?? opts.target)
      await writeYaml(io, outPath, merged)
      result.current = {
        code: 0,
        stdout: `imported ${flow.id} (mode=${mode}) → ${outPath}\n`,
        stderr: '',
      }
    })
  return { program, result }
}

export const flowImportJson: CliCommand = {
  name: 'flow import-json',
  summary: 'Import a FlowEnvelope JSON into an existing config',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildImportProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
