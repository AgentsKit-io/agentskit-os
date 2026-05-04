import { Command } from 'commander'
import { getTriggerPreset, listTriggerPresets } from '@agentskit/os-core'
import type { TriggerPreset } from '@agentskit/os-core'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('trigger preset')
    .description('List or show curated trigger presets (ready-to-map TriggerConfig examples).')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })

  program
    .command('list')
    .description('Print all preset ids')
    .option('--json', 'emit JSON', false)
    .action(async (opts: { json?: boolean }) => {
      const presets = listTriggerPresets()
      if (opts.json) {
        result.current = { code: 0, stdout: `${JSON.stringify(presets, null, 2)}\n`, stderr: '' }
        return
      }
      const lines = presets.map((p: TriggerPreset) => `${p.id}\t${p.title}`)
      result.current = { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
    })

  program
    .command('show')
    .description('Print one preset by id')
    .argument('<id>', 'preset id, e.g. webhook/inbound-generic')
    .option('--json', 'emit JSON', false)
    .action(async (id: string, opts: { json?: boolean }) => {
      const preset = getTriggerPreset(id)
      if (!preset) {
        // Use root command so `exitOverride` from runCommander applies (subcommand.error would call process.exit).
        program.error(`unknown preset: ${id}`, { exitCode: 1 })
      } else if (opts.json) {
        result.current = { code: 0, stdout: `${JSON.stringify(preset, null, 2)}\n`, stderr: '' }
      } else {
        const out =
          `${preset.id} — ${preset.title}\n` +
          `${preset.description}\n\n` +
          `${JSON.stringify(preset.trigger, null, 2)}\n`
        result.current = { code: 0, stdout: out, stderr: '' }
      }
    })

  return { program, result }
}

export const triggerPreset: CliCommand = {
  name: 'trigger preset',
  summary: 'List/show built-in trigger presets',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
