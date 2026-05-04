import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { newCmd } from './new.js'

const help = `agentskit-os wizard [<dir>] [--persona <dev|agency|clinical|non-tech>] [--force]

Interactive first-run wizard that routes you to a starter template.

Personas:
  dev        PR review + coding workflow starter
  agency     marketing 3-way review starter
  clinical   clinical consensus + HITL starter
  non-tech   support triage starter

If no --persona is provided, the wizard will prompt.
Exit codes: 0 ok, 2 usage error.
`

type Persona = 'dev' | 'agency' | 'clinical' | 'non-tech'

const personaToTemplate: Record<Persona, string> = {
  dev: 'pr-review',
  agency: 'marketing-3way',
  clinical: 'clinical-consensus',
  'non-tech': 'support-triage',
}

type Args = {
  dir?: string
  persona?: Persona
  force: boolean
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { force: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--force') {
      out.force = true
      i++
      continue
    }
    if (a === '--persona') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: '--persona requires a value' }
      if (v !== 'dev' && v !== 'agency' && v !== 'clinical' && v !== 'non-tech') {
        return { ...out, usage: `unknown persona "${v}"` }
      }
      out.persona = v
      i += 2
      continue
    }
    if (a?.startsWith('--')) return { ...out, usage: `unknown flag "${a}"` }
    if (out.dir !== undefined) return { ...out, usage: 'only one positional <dir> argument allowed' }
    if (a !== undefined) out.dir = a
    i++
  }
  return out
}

const promptPersona = async (io: CliIo): Promise<Persona> => {
  if (!io.prompt) {
    throw new Error('prompt unavailable')
  }
  const answer = (await io.prompt(
    'Choose persona (dev / agency / clinical / non-tech): ',
  ))
    .trim()
    .toLowerCase()
  if (answer === 'dev' || answer === 'agency' || answer === 'clinical' || answer === 'non-tech') {
    return answer
  }
  return 'dev'
}

export const wizard: CliCommand = {
  name: 'wizard',
  summary: 'Interactive first-run template wizard',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    let persona: Persona
    try {
      persona = args.persona ?? (await promptPersona(io))
    } catch {
      return {
        code: 2,
        stdout: '',
        stderr: `error: interactive prompt unavailable; pass --persona\n\n${help}`,
      }
    }

    const templateId = personaToTemplate[persona]
    const delegatedArgv = [
      templateId,
      ...(args.dir ? [args.dir] : []),
      ...(args.force ? ['--force'] : []),
    ]

    const res = await newCmd.run(delegatedArgv, io)
    if (res.code !== 0) return res

    const lines = [
      `Wizard persona: ${persona}`,
      `Template: ${templateId}`,
      ``,
      res.stdout.trimEnd(),
      ``,
    ]
    return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
  },
}

