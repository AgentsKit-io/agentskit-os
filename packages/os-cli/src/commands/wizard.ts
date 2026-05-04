import {
  BUILTIN_PROVIDERS,
  checkProviderKeys,
  type ProviderCheckResult,
} from '@agentskit/os-core'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'
import { newCmd } from './new.js'

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
  usage?: string
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
    const tag = r.status === 'ok' ? 'ok' : r.status === 'skipped' ? 'skipped' : 'MISSING'
    const detail = r.status === 'missing'
      ? `  needs: ${r.missingKeys.join(', ')}  hint: ${r.remediation ?? ''}`
      : ''
    lines.push(`  [${tag}] ${r.providerId}${detail}`)
  }
  if (results.some((r) => r.status === 'missing')) {
    lines.push('Run `agentskit-os creds check` after setting the keys to verify.')
  }
  return lines.join('\n')
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { force: false, airGap: false, envPrefix: 'AGENTSKITOS_' }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--force') {
      out.force = true
      i++
      continue
    }
    if (a === '--air-gap') {
      out.airGap = true
      i++
      continue
    }
    if (a === '--env-prefix') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: '--env-prefix requires a value' }
      out.envPrefix = v
      i += 2
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

    const expected = personaProviders[persona]
    const present = presentEnvKeys(args.envPrefix, process.env)
    const credResults = BUILTIN_PROVIDERS
      .filter((p) => expected.includes(p.id))
      .map((p) => checkProviderKeys(p, present, { airGapped: args.airGap }))
    const credSummary = renderCredSummary(credResults)

    const telemetryLine = await maybePromptTelemetry(io, args.dir ?? '.')

    const lines = [
      `Wizard persona: ${persona}`,
      `Template: ${templateId}`,
      ``,
      res.stdout.trimEnd(),
      ``,
      ...(credSummary ? [credSummary, ``] : []),
      ...(telemetryLine ? [telemetryLine, ``] : []),
    ]
    return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
  },
}

const maybePromptTelemetry = async (io: CliIo, baseDir: string): Promise<string | undefined> => {
  if (!io.prompt) return undefined
  const consentPath = `${baseDir}/.agentskitos/telemetry/consent.json`
  if (await io.exists(consentPath)) return undefined
  let answer = ''
  try {
    answer = (await io.prompt(
      'Enable anonymous telemetry to help improve AgentsKitOS? Captures verb names, run mode, error codes — never prompts or content. (y/N): ',
    )).trim().toLowerCase()
  } catch {
    return undefined
  }
  const enabled = answer === 'y' || answer === 'yes'
  const installId = enabled
    ? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    : undefined
  const payload = { state: enabled ? 'enabled' : 'disabled', decidedAt: new Date().toISOString(), ...(installId ? { installId } : {}) }
  await io.mkdir(`${baseDir}/.agentskitos/telemetry`)
  await io.writeFile(consentPath, `${JSON.stringify(payload, null, 2)}\n`)
  return enabled
    ? 'Telemetry: enabled. Toggle anytime with `agentskit-os telemetry disable`.'
    : 'Telemetry: disabled. Enable anytime with `agentskit-os telemetry enable`.'
}

