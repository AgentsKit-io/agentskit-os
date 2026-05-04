import { getTriggerPreset, listTriggerPresets } from '@agentskit/os-core'
import type { TriggerPreset } from '@agentskit/os-core'
import type { CliCommand, CliExit } from '../types.js'

const help = `agentskit-os trigger preset <list|show> [id] [--json]

Lists curated trigger presets (ready-to-map TriggerConfig examples).

Examples:
  agentskit-os trigger preset list
  agentskit-os trigger preset show webhook/inbound-generic --json
`

export const triggerPreset: CliCommand = {
  name: 'trigger preset',
  summary: 'List/show built-in trigger presets',
  run: async (argv): Promise<CliExit> => {
    if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    const asJson = argv.includes('--json')
    const args = argv.filter((a) => a !== '--json')

    const cmd = args[0]
    if (cmd === 'list') {
      const presets = listTriggerPresets()
      if (asJson) {
        return { code: 0, stdout: `${JSON.stringify(presets, null, 2)}\n`, stderr: '' }
      }
      const lines = presets.map((p: TriggerPreset) => `${p.id}\t${p.title}`)
      return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
    }

    if (cmd === 'show') {
      const id = args[1]
      if (!id) return { code: 2, stdout: '', stderr: `${help}\nerror: missing preset id\n` }
      const preset = getTriggerPreset(id)
      if (!preset) return { code: 1, stdout: '', stderr: `unknown preset: ${id}\n` }
      if (asJson) {
        return { code: 0, stdout: `${JSON.stringify(preset, null, 2)}\n`, stderr: '' }
      }
      const out =
        `${preset.id} — ${preset.title}\n` +
        `${preset.description}\n\n` +
        `${JSON.stringify(preset.trigger, null, 2)}\n`
      return { code: 0, stdout: out, stderr: '' }
    }

    return { code: 2, stdout: '', stderr: `${help}\nerror: unknown subcommand "${cmd}"\n` }
  },
}
