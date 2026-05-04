import { Command } from 'commander'
import {
  BUILTIN_PROVIDERS,
  checkProviderKeys,
  filterProviders,
  type ProviderCheckResult,
  type ProviderRequirement,
} from '@agentskit/os-core'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

const collect = (value: string, previous: string[]): string[] => [...previous, value]

type CredsCliOpts = {
  airGap?: boolean
  kind: string[]
  provider: string[]
  json?: boolean
  envPrefix?: string
}

type Args = {
  sub: 'list' | 'check'
  airGap: boolean
  kinds: string[]
  providers: string[]
  json: boolean
  envPrefix: string
}

const toArgs = (sub: 'list' | 'check', opts: CredsCliOpts): Args => ({
  sub,
  airGap: opts.airGap === true,
  kinds: opts.kind ?? [],
  providers: opts.provider ?? [],
  json: opts.json === true,
  envPrefix: opts.envPrefix ?? 'AGENTSKITOS_',
})

const select = (args: Args): readonly ProviderRequirement[] => {
  let pool = filterProviders(BUILTIN_PROVIDERS, {
    airGapped: args.airGap,
    ...(args.kinds.length > 0 ? { kinds: args.kinds as ProviderRequirement['kind'][] } : {}),
  })
  if (args.providers.length > 0) {
    const keep = new Set(args.providers)
    pool = pool.filter((p) => keep.has(p.id))
  }
  return pool
}

const presentKeysFromEnv = (envPrefix: string, env: NodeJS.ProcessEnv): Set<string> => {
  const present = new Set<string>()
  for (const key of Object.keys(env)) {
    const value = env[key]
    if (value === undefined || value === '') continue
    present.add(key)
    if (key.startsWith(envPrefix)) present.add(key.slice(envPrefix.length))
  }
  return present
}

const renderListText = (providers: readonly ProviderRequirement[]): string => {
  if (providers.length === 0) return '(no providers match the filter)\n'
  const lines: string[] = []
  for (const p of providers) {
    const required = p.requiredKeys.length > 0 ? p.requiredKeys.join(', ') : '(none)'
    const optional = p.optionalKeys.length > 0 ? `  optional: ${p.optionalKeys.join(', ')}` : ''
    lines.push(`${p.id.padEnd(14)} ${p.kind.padEnd(11)} cloud=${p.cloud}  required: ${required}${optional}`)
  }
  return `${lines.join('\n')}\n`
}

const renderCheckText = (results: readonly ProviderCheckResult[]): string => {
  const lines: string[] = []
  for (const r of results) {
    const tag = r.status === 'ok' ? 'ok' : r.status === 'skipped' ? 'skipped' : 'MISSING'
    const detail =
      r.status === 'missing' ? `  missing: ${r.missingKeys.join(', ')}  hint: ${r.remediation ?? ''}` : ''
    lines.push(`[${tag}] ${r.providerId}${detail}`)
  }
  return `${lines.join('\n')}\n`
}

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('creds')
    .description(
      'agentskit-os creds — List or verify provider/integration credentials (no secret values printed).',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })

  program
    .command('list')
    .description('List known providers + their required vault keys')
    .option('--air-gap', 'treat workspace as air-gapped (skip cloud providers)', false)
    .option('--kind <k>', 'filter by kind (repeatable)', collect, [])
    .option('--provider <id>', 'restrict to provider id (repeatable)', collect, [])
    .option('--json', 'emit JSON', false)
    .option('--env-prefix <pfx>', 'process.env prefix to scan', 'AGENTSKITOS_')
    .action(async (opts: CredsCliOpts) => {
      const args = toArgs('list', opts)
      const providers = select(args)
      const stdout = args.json ? `${JSON.stringify(providers)}\n` : renderListText(providers)
      result.current = { code: 0, stdout, stderr: '' }
    })

  program
    .command('check')
    .description('Verify env/vault for the required keys per provider')
    .option('--air-gap', 'treat workspace as air-gapped (skip cloud providers)', false)
    .option('--kind <k>', 'filter by kind (repeatable)', collect, [])
    .option('--provider <id>', 'restrict to provider id (repeatable)', collect, [])
    .option('--json', 'emit JSON', false)
    .option('--env-prefix <pfx>', 'process.env prefix to scan', 'AGENTSKITOS_')
    .action(async (opts: CredsCliOpts) => {
      const args = toArgs('check', opts)
      const providers = select(args)
      const present = presentKeysFromEnv(args.envPrefix, process.env)
      const results = providers.map((p) => checkProviderKeys(p, present, { airGapped: args.airGap }))
      const anyMissing = results.some((r) => r.status === 'missing')
      const stdout = args.json ? `${JSON.stringify(results)}\n` : renderCheckText(results)
      result.current = { code: anyMissing ? 7 : 0, stdout, stderr: '' }
    })

  return { program, result }
}

export const creds: CliCommand = {
  name: 'creds',
  summary: 'List or verify provider/integration credentials (no secret values printed)',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
