import { buildProvenance, mergeLayers, CONFIG_LAYERS } from '@agentskit/os-core/config/merge'
import type { ConfigLayer } from '@agentskit/os-core'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { loadConfigFile } from '../loader.js'

const help = `agentskit-os config explain [--<layer> <path>]...

Loads zero or more config files keyed by layer (defaults, global, workspace, env, runtime),
merges them per ADR-0003 precedence, and prints which layer set each leaf value.

Example:
  agentskit-os config explain \\
    --defaults defaults.yaml \\
    --workspace agentskit-os.config.yaml \\
    --env env.yaml

Exit codes: 0 ok, 1 parse error, 2 usage error, 3 read error.
`

const parseArgs = (
  argv: readonly string[],
): { layers: Partial<Record<ConfigLayer, string>>; usage?: string } => {
  const layers: Partial<Record<ConfigLayer, string>> = {}
  let i = 0
  while (i < argv.length) {
    const flag = argv[i]
    if (flag === '--help' || flag === '-h') return { layers, usage: 'help' }
    if (!flag?.startsWith('--')) return { layers, usage: `unexpected token "${flag}"` }
    const layer = flag.slice(2) as ConfigLayer
    if (!CONFIG_LAYERS.includes(layer)) {
      return { layers, usage: `unknown layer "${layer}" (valid: ${CONFIG_LAYERS.join(', ')})` }
    }
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) {
      return { layers, usage: `--${layer} requires a path argument` }
    }
    layers[layer] = value
    i += 2
  }
  return { layers }
}

export const configExplain: CliCommand = {
  name: 'config explain',
  summary: 'Show which config layer set each leaf value (uses buildProvenance)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { layers, usage } = parseArgs(argv)
    if (usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (usage) return { code: 2, stdout: '', stderr: `error: ${usage}\n\n${help}` }
    if (Object.keys(layers).length === 0) return { code: 2, stdout: '', stderr: help }

    const inputs: Partial<Record<ConfigLayer, unknown>> = {}
    for (const layer of CONFIG_LAYERS) {
      const path = layers[layer]
      if (!path) continue
      const loaded = await loadConfigFile(io, path)
      if (!loaded.ok) return { code: loaded.code, stdout: '', stderr: loaded.message }
      inputs[layer] = loaded.value
    }

    const merged = mergeLayers(inputs as never)
    const prov = buildProvenance(inputs as never)

    const sortedKeys = [...prov.keys()].sort()
    const lines = sortedKeys.map((k) => `  ${k.padEnd(48)} ← ${prov.get(k)?.layer}`)

    return {
      code: 0,
      stdout: `merged config (${sortedKeys.length} leaf${sortedKeys.length === 1 ? '' : 's'}):\n${lines.join('\n')}\n\n--- merged value ---\n${JSON.stringify(merged, null, 2)}\n`,
      stderr: '',
    }
  },
}
