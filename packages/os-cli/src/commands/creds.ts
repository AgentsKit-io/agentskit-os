import { dirname, resolve } from 'node:path'
import { chmod } from 'node:fs/promises'
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
import { defaultIo } from '../io.js'
import type { CliIo } from '../types.js'
import {
  isCredentialEnvKey,
  localCredentialsFilePath,
  parseLocalCredentialLines,
  serializeLocalCredentialLines,
} from '../lib/local-credentials-file.js'
import { readSecretFromStdin } from '../lib/read-secret-once.js'

const collect = (value: string, previous: string[]): string[] => [...previous, value]

type CredsCliOpts = {
  airGap?: boolean
  kind: string[]
  provider: string[]
  json?: boolean
  envPrefix?: string
  secretsFile?: string
  project?: string
  stdin?: boolean
}

type Args = {
  sub: 'list' | 'check' | 'set' | 'guide'
  airGap: boolean
  kinds: string[]
  providers: string[]
  json: boolean
  envPrefix: string
  secretsFile?: string
  projectDir: string
  setKey?: string
  stdin?: boolean
}

const toArgs = (sub: Args['sub'], opts: CredsCliOpts, projectDir: string, setKey?: string): Args => ({
  sub,
  airGap: opts.airGap === true,
  kinds: opts.kind ?? [],
  providers: opts.provider ?? [],
  json: opts.json === true,
  envPrefix: opts.envPrefix ?? 'AGENTSKITOS_',
  ...(opts.secretsFile !== undefined && opts.secretsFile !== ''
    ? { secretsFile: opts.secretsFile }
    : {}),
  projectDir,
  ...(setKey !== undefined ? { setKey } : {}),
  stdin: opts.stdin === true,
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

const mergeSecretsFile = async (
  present: Set<string>,
  secretsFile: string | undefined,
  io: CliIo,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!secretsFile) return { ok: true }
  try {
    const raw = await io.readFile(secretsFile)
    for (const key of parseLocalCredentialLines(raw).keys()) {
      if (key) present.add(key)
    }
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `cannot read --secrets-file ${secretsFile}: ${msg}` }
  }
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

const renderGuideText = (): string => {
  const lines: string[] = [
    'AgentsKitOS — guided provider credentials (no secret values echoed by these commands).',
    '',
    '1) Pick a provider and open its docs URL (from `agentskit-os creds list --json`).',
    '2) Store keys in the workspace local vault file (0600) without printing the value:',
    '     agentskit-os creds set OPENAI_API_KEY --stdin --project . < secret.txt',
    '   (paste or pipe the secret; stdout will only confirm the path written.)',
    '3) Verify presence (still no values printed):',
    '     agentskit-os creds check --secrets-file .agentskitos/vault/local.env',
    '4) Air-gapped workspaces skip cloud LLMs:',
    '     agentskit-os creds check --air-gap --secrets-file .agentskitos/vault/local.env',
    '5) Doctor includes the same checks:',
    '     agentskit-os doctor --creds --secrets-file .agentskitos/vault/local.env',
    '',
    'Config references use vault ref syntax `${vault:key}` (lowercase key) in YAML; env vars',
    'above use provider catalog names (e.g. OPENAI_API_KEY). Map keys accordingly when authoring config.',
    '',
    'Manual / CI / enterprise:',
    '  • Manual: use `creds set` or export env vars before `creds check`.',
    '  • CI: inject env or mount a secrets file and pass `--secrets-file`.',
    '  • Enterprise: point vault backend at the same key names; do not commit `.agentskitos/vault/`.',
    '',
  ]
  return `${lines.join('\n')}\n`
}

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('creds')
    .description(
      'agentskit-os creds — List, verify, or store provider credentials (no secret values printed).',
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
      const args = toArgs('list', opts, io.cwd())
      const providers = select(args)
      const stdout = args.json ? `${JSON.stringify(providers)}\n` : renderListText(providers)
      result.current = { code: 0, stdout, stderr: '' }
    })

  program
    .command('check')
    .description('Verify env/vault file for the required keys per provider')
    .option('--air-gap', 'treat workspace as air-gapped (skip cloud providers)', false)
    .option('--kind <k>', 'filter by kind (repeatable)', collect, [])
    .option('--provider <id>', 'restrict to provider id (repeatable)', collect, [])
    .option('--json', 'emit JSON', false)
    .option('--env-prefix <pfx>', 'process.env prefix to scan', 'AGENTSKITOS_')
    .option(
      '--secrets-file <path>',
      'dotenv-style KEY=value file merged into presence checks (values never printed)',
    )
    .action(async (opts: CredsCliOpts) => {
      const args = toArgs('check', opts, io.cwd())
      const providers = select(args)
      const present = presentKeysFromEnv(args.envPrefix, process.env)
      const merged = await mergeSecretsFile(present, args.secretsFile, io)
      if (!merged.ok) {
        result.current = { code: 2, stdout: '', stderr: `${merged.error}\n` }
        return
      }
      const results = providers.map((p) => checkProviderKeys(p, present, { airGapped: args.airGap }))
      const anyMissing = results.some((r) => r.status === 'missing')
      const stdout = args.json ? `${JSON.stringify(results)}\n` : renderCheckText(results)
      result.current = { code: anyMissing ? 7 : 0, stdout, stderr: '' }
    })

  program
    .command('set <key>')
    .description(
      'Store a single credential key in .agentskitos/vault/local.env (0600). Value from --stdin only.',
    )
    .option('--stdin', 'read secret value from stdin (recommended; avoids shell history)', false)
    .option('--project <dir>', 'workspace root (default: current directory)')
    .action(async (key: string, opts: { stdin?: boolean; project?: string }) => {
      const projectDir = resolve(io.cwd(), opts.project ?? '.')
      if (!isCredentialEnvKey(key)) {
        result.current = {
          code: 2,
          stdout: '',
          stderr: 'error: key must look like OPENAI_API_KEY (A-Z, digits, underscore).\n',
        }
        return
      }
      if (opts.stdin !== true) {
        result.current = {
          code: 2,
          stdout: '',
          stderr: 'error: --stdin is required so the secret is not passed on the command line.\n',
        }
        return
      }
      const value = await readSecretFromStdin()
      if (!value) {
        result.current = { code: 2, stdout: '', stderr: 'error: empty stdin; nothing written.\n' }
        return
      }
      const vaultPath = localCredentialsFilePath(projectDir)
      await io.mkdir(dirname(vaultPath))
      let next = new Map<string, string>()
      if (await io.exists(vaultPath)) {
        try {
          next = parseLocalCredentialLines(await io.readFile(vaultPath))
        } catch {
          next = new Map()
        }
      }
      next.set(key, value)
      const body = serializeLocalCredentialLines(next)
      await io.writeFile(vaultPath, body)
      try {
        await chmod(vaultPath, 0o600)
      } catch {
        /* best-effort chmod */
      }
      const rel = vaultPath.startsWith(projectDir + '/') ? vaultPath.slice(projectDir.length + 1) : vaultPath
      result.current = {
        code: 0,
        stdout:
          `wrote ${key} to ${vaultPath}\n` +
          `verify: agentskit-os creds check --secrets-file ${rel} --project ${projectDir}\n`,
        stderr: '',
      }
    })

  program
    .command('guide')
    .description('Print the guided credential onboarding playbook (stdout only)')
    .action(async () => {
      result.current = { code: 0, stdout: renderGuideText(), stderr: '' }
    })

  return { program, result }
}

export const creds: CliCommand = {
  name: 'creds',
  summary: 'List, verify, store, or guide provider credentials (no secret values printed)',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
