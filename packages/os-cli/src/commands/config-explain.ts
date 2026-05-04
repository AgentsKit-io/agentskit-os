import { Command } from 'commander'
import { buildProvenance, mergeLayers, CONFIG_LAYERS } from '@agentskit/os-core/config/merge'
import type { ConfigLayer } from '@agentskit/os-core'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const LAYER_OPTS: readonly { layer: ConfigLayer; desc: string }[] = [
  { layer: 'defaults', desc: 'defaults layer config path' },
  { layer: 'global', desc: 'global layer config path' },
  { layer: 'workspace', desc: 'workspace layer config path' },
  { layer: 'env', desc: 'env layer config path' },
  { layer: 'runtime', desc: 'runtime layer config path' },
]

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('config explain')
    .description(
      'agentskit-os config explain — Show which config layer set each leaf value (ADR-0003 merge provenance).',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })

  for (const { layer, desc } of LAYER_OPTS) {
    program.option(`--${layer} <path>`, desc)
  }

  program.action(async (opts: Record<string, unknown>) => {
    const layers: Partial<Record<ConfigLayer, string>> = {}
    for (const layer of CONFIG_LAYERS) {
      const v = opts[layer]
      if (typeof v === 'string' && v.length > 0) {
        layers[layer] = v
      }
    }
    if (Object.keys(layers).length === 0) {
      program.error(
        'error: specify at least one layer path (e.g. --workspace agentskit-os.config.yaml). Use --help for full usage.',
        { exitCode: 2 },
      )
    }

    const inputs: Partial<Record<ConfigLayer, unknown>> = {}
    for (const layer of CONFIG_LAYERS) {
      const path = layers[layer]
      if (!path) continue
      const loaded = await loadConfigFile(io, path)
      if (!loaded.ok) {
        result.current = { code: loaded.code, stdout: '', stderr: loaded.message }
        return
      }
      inputs[layer] = loaded.value
    }

    const merged = mergeLayers(inputs as never)
    const prov = buildProvenance(inputs as never)

    const sortedKeys = [...prov.keys()].sort()
    const lines = sortedKeys.map((k) => `  ${k.padEnd(48)} ← ${prov.get(k)?.layer}`)

    result.current = {
      code: 0,
      stdout: `merged config (${sortedKeys.length} leaf${sortedKeys.length === 1 ? '' : 's'}):\n${lines.join('\n')}\n\n--- merged value ---\n${JSON.stringify(merged, null, 2)}\n`,
      stderr: '',
    }
  })

  return { program, result }
}

export const configExplain: CliCommand = {
  name: 'config explain',
  summary: 'Show which config layer set each leaf value (uses buildProvenance)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
