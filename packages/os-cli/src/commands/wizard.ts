import { Command, Option } from 'commander'
import {
  BUILTIN_PROVIDERS,
  checkProviderKeys,
  type ProviderCheckResult,
} from '@agentskit/os-core'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { newCmd } from './new.js'
import { providerCheckMissingDetail, providerCheckTag } from './creds'

const help = `agentskit-os wizard [<dir>] [--persona <dev|agency|clinical|non-tech>] [--force] [--air-gap] [--env-prefix <pfx>]

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
  airGap: boolean
  envPrefix: string
}

const personaProviders: Record<Persona, readonly string[]> = {
  dev: ['openai', 'anthropic', 'github'],
  agency: ['openai', 'anthropic', 'slack'],
  clinical: ['anthropic', 'marketplace'],
  'non-tech': ['openai'],
}

const presentEnvKeys = (envPrefix: string, env: NodeJS.ProcessEnv): Set<string> => {
  const present = new Set<string>()
  for (const key of Object.keys(env)) {
    const value = env[key]
    if (value === undefined || value === '') continue
    present.add(key)
    if (key.startsWith(envPrefix)) present.add(key.slice(envPrefix.length))
  }
  return present
}

const renderCredSummary = (results: readonly ProviderCheckResult[]): string => {
  if (results.length === 0) return ''
  const lines: string[] = ['Credential check:']
  for (const r of results) {
    const tag = providerCheckTag(r.status)
    const detail = providerCheckMissingDetail(r).replace('  missing:', '  needs:')
    lines.push(`  [${tag}] ${r.providerId}${detail}`)
  }
  if (results.some((r) => r.status === 'missing')) {
    lines.push('Run `agentskit-os creds check` after setting the keys to verify.')
  }
  return lines.join('\n')
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

const executeWizard = async (args: Args, io: CliIo): Promise<CliExit> => {
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

  const expected = personaProviders[persona]
  const present = presentEnvKeys(args.envPrefix, process.env)
  const credResults = BUILTIN_PROVIDERS
    .filter((p) => expected.includes(p.id))
    .map((p) => checkProviderKeys(p, present, { airGapped: args.airGap }))
  const credSummary = renderCredSummary(credResults)

  const lines = [
    `Wizard persona: ${persona}`,
    `Template: ${templateId}`,
    ``,
    res.stdout.trimEnd(),
    ``,
    ...(credSummary ? [credSummary, ``] : []),
    ...(args.airGap
      ? ['Air-gap: cloud provider keys are skipped in checks; use local models (Ollama / LM Studio) if needed.', ``]
      : []),
    `Credentials: run \`agentskit-os creds guide\` (store with \`creds set KEY --stdin\`, verify with \`creds check --secrets-file .agentskitos/vault/local.env\`).`,
    `Health:    run \`agentskit-os doctor --creds --secrets-file .agentskitos/vault/local.env\` after writing the vault file.`,
    ``,
  ]
  return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
}

type WizardCliOpts = {
  persona?: Persona
  force?: boolean
  airGap?: boolean
  envPrefix?: string
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('wizard')
    .description('agentskit-os wizard — Interactive first-run template wizard.')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .argument('[dir]', 'target directory')
    .addOption(
      new Option('--persona <p>', 'persona preset').choices(['dev', 'agency', 'clinical', 'non-tech']),
    )
    .option('--force', 'overwrite existing config', false)
    .option('--air-gap', 'treat workspace as air-gapped for cred checks', false)
    .option('--env-prefix <pfx>', 'process.env prefix to scan', 'AGENTSKITOS_')
    .action(async (dir: string | undefined, opts: WizardCliOpts) => {
      const args: Args = {
        ...(dir !== undefined ? { dir } : {}),
        ...(opts.persona !== undefined ? { persona: opts.persona } : {}),
        force: opts.force === true,
        airGap: opts.airGap === true,
        envPrefix: opts.envPrefix ?? 'AGENTSKITOS_',
      }
      result.current = await executeWizard(args, io)
    })

  return { program, result }
}

export const wizard: CliCommand = {
  name: 'wizard',
  summary: 'Interactive first-run template wizard',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
