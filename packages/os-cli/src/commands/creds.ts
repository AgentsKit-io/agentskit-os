import {
  BUILTIN_PROVIDERS,
  checkProviderKeys,
  filterProviders,
  type ProviderCheckResult,
  type ProviderRequirement,
} from '@agentskit/os-core'
import type { CliCommand, CliExit } from '../types.js'

const help = `agentskit-os creds <subcommand>

Inspect provider/integration credentials WITHOUT printing secret values.

Subcommands:
  list                   list known providers + their required vault keys
  check                  verify env/vault for the required keys per provider

Common options:
  --air-gap              treat workspace as air-gapped (skip cloud providers)
  --kind <k>             llm | integration | marketplace | local (repeat for many)
  --provider <id>        restrict to a specific provider id (repeat for many)
  --json                 emit JSON on stdout
  --env-prefix <pfx>     prefix to look for in process.env (default AGENTSKITOS_)
                         falls back to checking the bare key name as well

Exit codes: 0 ok, 2 usage error, 7 one or more required credentials missing.

Notes:
- This command only reads metadata + key presence. It NEVER prints values.
- For machine-readable output (CI/desktop), pass --json.
- Real provider liveness probes belong in \`agentskit-os doctor --live\`.
`

type Args = {
  sub?: 'list' | 'check'
  airGap: boolean
  kinds: string[]
  providers: string[]
  json: boolean
  envPrefix: string
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { airGap: false, kinds: [], providers: [], json: false, envPrefix: 'AGENTSKITOS_' }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--air-gap') { out.airGap = true; i++; continue }
    if (a === '--json') { out.json = true; i++; continue }
    if (a === '--kind' || a === '--provider' || a === '--env-prefix') {
      const v = argv[i + 1]
      if (v === undefined || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--kind') out.kinds.push(v)
      else if (a === '--provider') out.providers.push(v)
      else out.envPrefix = v
      i += 2
      continue
    }
    if (a === 'list' || a === 'check') {
      if (out.sub !== undefined) return { ...out, usage: `unexpected positional "${a}"` }
      out.sub = a
      i++
      continue
    }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  if (!out.sub) return { ...out, usage: 'missing subcommand (list | check)' }
  return out
}

const select = (args: Args): readonly ProviderRequirement[] => {
  let pool = filterProviders(BUILTIN_PROVIDERS, {
    airGapped: args.airGap,
    kinds: args.kinds.length > 0 ? (args.kinds as ProviderRequirement['kind'][]) : undefined,
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

export const creds: CliCommand = {
  name: 'creds',
  summary: 'List or verify provider/integration credentials (no secret values printed)',
  run: async (argv): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    const providers = select(args)

    if (args.sub === 'list') {
      const stdout = args.json ? `${JSON.stringify(providers)}\n` : renderListText(providers)
      return { code: 0, stdout, stderr: '' }
    }

    const present = presentKeysFromEnv(args.envPrefix, process.env)
    const results = providers.map((p) => checkProviderKeys(p, present, { airGapped: args.airGap }))
    const anyMissing = results.some((r) => r.status === 'missing')

    const stdout = args.json ? `${JSON.stringify(results)}\n` : renderCheckText(results)
    return { code: anyMissing ? 7 : 0, stdout, stderr: '' }
  },
}
