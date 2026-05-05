import { readFile } from 'node:fs/promises'
import { Command } from 'commander'
import {
  BUILTIN_PROVIDERS,
  checkProviderKeys,
  PACKAGE_VERSION as OS_CORE_VERSION,
  type ProviderCheckResult,
} from '@agentskit/os-core'
import { parseLocalCredentialLines } from '../lib/local-credentials-file.js'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'
import { CLI_VERSION } from './version.js'

type Check = { name: string; ok: boolean; detail: string }

export type LiveCheckStatus = 'ok' | 'fail' | 'skipped'

export type LiveChecks = {
  readonly llm: LiveCheckStatus
  readonly sandbox: LiveCheckStatus
  readonly llmDetail?: string
  readonly sandboxDetail?: string
}

/** Minimal LlmAdapter shape for the doctor probe — no provider SDK import. */
export type DoctorLlmAdapter = {
  invoke(call: {
    readonly system: string
    readonly model: string
    readonly messages: ReadonlyArray<{ role: 'user'; content: string }>
    readonly maxTokens?: number
  }): Promise<{ readonly text: string; readonly finishReason: string }>
}

/** Minimal sandbox spawner shape for the doctor probe — injectable for tests. */
export type DoctorSandboxSpawner = {
  spawn(opts: {
    command: string
    args: readonly string[]
    stdio: 'pipe'
  }): Promise<{ pid: number; exitCode: Promise<number> }>
}

export type DoctorLiveOpts = {
  readonly llmAdapter?: DoctorLlmAdapter
  readonly sandboxSpawner?: DoctorSandboxSpawner
  /** Override timeouts. Defaults: llm=10_000ms, sandbox=5_000ms. */
  readonly timeoutMs:
    | {
        readonly llm: number | undefined
        readonly sandbox: number | undefined
      }
    | undefined
}

export type DoctorReport = {
  readonly checks: readonly Check[]
  readonly failed: number
  readonly liveChecks?: LiveChecks
  readonly credChecks?: readonly ProviderCheckResult[]
}

export type DoctorCredOpts = {
  readonly airGapped: boolean | undefined
  readonly envPrefix: string | undefined
  readonly providers: readonly string[] | undefined
  /** Key names treated as present (from `--secrets-file`; values never read for checks). */
  readonly extraPresentKeys: ReadonlySet<string> | undefined
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

const runCredChecks = (opts: DoctorCredOpts = {}): readonly ProviderCheckResult[] => {
  const present = presentEnvKeys(opts.envPrefix ?? 'AGENTSKITOS_', process.env)
  for (const k of opts.extraPresentKeys ?? []) {
    if (k) present.add(k)
  }
  const ids = opts.providers
  const pool = ids ? BUILTIN_PROVIDERS.filter((p) => ids.includes(p.id)) : BUILTIN_PROVIDERS
  const checkOpts = opts.airGapped !== undefined ? { airGapped: opts.airGapped } : {}
  return pool.map((p) => checkProviderKeys(p, present, checkOpts))
}

const MIN_NODE_MAJOR = 22

const checkNodeVersion = (): Check => {
  const v = process.versions.node
  const major = Number.parseInt(v.split('.')[0] ?? '0', 10)
  return {
    name: 'node',
    ok: major >= MIN_NODE_MAJOR,
    detail: `node ${v} (require >=${MIN_NODE_MAJOR})`,
  }
}

const checkOsCore = (): Check => ({
  name: 'os-core',
  ok: typeof OS_CORE_VERSION === 'string' && OS_CORE_VERSION.length > 0,
  detail: `@agentskit/os-core ${OS_CORE_VERSION}`,
})

const checkPlatform = (): Check => {
  const supported = ['darwin', 'linux', 'win32']
  const ok = supported.includes(process.platform)
  return {
    name: 'platform',
    ok,
    detail: `${process.platform} ${process.arch} (supported: ${supported.join(', ')})`,
  }
}

const checkAgentskitOsHome = (): Check => {
  const home = process.env.AGENTSKITOS_HOME
  return home
    ? { name: 'AGENTSKITOS_HOME', ok: true, detail: home }
    : { name: 'AGENTSKITOS_HOME', ok: true, detail: '(unset, will default to ~/.agentskitos)' }
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('os.cli.doctor_live_timeout'))
    }, ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })

const probeLlm = async (
  adapter: DoctorLlmAdapter,
  timeoutMs: number,
): Promise<{ status: LiveCheckStatus; detail: string }> => {
  try {
    const result = await withTimeout(
      adapter.invoke({
        system: 'You are a ping utility.',
        model: 'default',
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 8,
      }),
      timeoutMs,
    )
    if (typeof result.text !== 'string' || typeof result.finishReason !== 'string') {
      return { status: 'fail', detail: 'invalid response shape from LLM adapter' }
    }
    return { status: 'ok', detail: `llm responded (finishReason=${result.finishReason})` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { status: 'fail', detail: msg }
  }
}

const probeSandbox = async (
  spawner: DoctorSandboxSpawner,
  timeoutMs: number,
): Promise<{ status: LiveCheckStatus; detail: string }> => {
  try {
    const handle = await withTimeout(
      spawner.spawn({ command: 'true', args: [], stdio: 'pipe' }),
      timeoutMs,
    )
    const code = await withTimeout(handle.exitCode, timeoutMs)
    if (code !== 0) {
      return { status: 'fail', detail: `sandbox exited with code ${code}` }
    }
    return { status: 'ok', detail: `sandbox round-trip ok (pid=${handle.pid}, exit=0)` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { status: 'fail', detail: msg }
  }
}

const runLiveChecks = async (opts: DoctorLiveOpts): Promise<LiveChecks> => {
  const timeouts = opts.timeoutMs
  let llmTimeout = 10_000
  let sandboxTimeout = 5_000
  if (timeouts) {
    if (timeouts.llm !== undefined) llmTimeout = timeouts.llm
    if (timeouts.sandbox !== undefined) sandboxTimeout = timeouts.sandbox
  }

  const [llmResult, sandboxResult] = await Promise.all([
    opts.llmAdapter
      ? probeLlm(opts.llmAdapter, llmTimeout)
      : Promise.resolve({ status: 'skipped' as const, detail: 'no LLM adapter injected' }),
    opts.sandboxSpawner
      ? probeSandbox(opts.sandboxSpawner, sandboxTimeout)
      : Promise.resolve({ status: 'skipped' as const, detail: 'no sandbox spawner injected' }),
  ])

  return {
    llm: llmResult.status,
    sandbox: sandboxResult.status,
    llmDetail: llmResult.detail,
    sandboxDetail: sandboxResult.detail,
  }
}

export const runDoctor = async (
  live: boolean,
  liveOpts?: DoctorLiveOpts,
  credOpts?: DoctorCredOpts | false,
): Promise<DoctorReport> => {
  const checks: Check[] = [
    checkNodeVersion(),
    checkPlatform(),
    checkOsCore(),
    checkAgentskitOsHome(),
  ]
  const failed = checks.filter((c) => !c.ok).length

  let credChecks: readonly ProviderCheckResult[] | undefined
  if (credOpts !== false) credChecks = runCredChecks(credOpts ?? {})

  if (!live) {
    if (credChecks) return { checks, failed, credChecks }
    return { checks, failed }
  }

  const liveChecks = await runLiveChecks(liveOpts ?? {})
  if (credChecks) return { checks, failed, liveChecks, credChecks }
  return { checks, failed, liveChecks }
}

const formatReport = (report: DoctorReport): CliExit => {
  const lines = report.checks.map(
    (c) => `${c.ok ? '[ok]' : '[FAIL]'} ${c.name.padEnd(20)} ${c.detail}`,
  )

  if (report.liveChecks) {
    const lc = report.liveChecks
    let llmIcon = '[skip]'
    if (lc.llm === 'ok') llmIcon = '[ok]'
    else if (lc.llm === 'fail') llmIcon = '[FAIL]'
    let sbIcon = '[skip]'
    if (lc.sandbox === 'ok') sbIcon = '[ok]'
    else if (lc.sandbox === 'fail') sbIcon = '[FAIL]'
    lines.push(`${llmIcon} ${'live:llm'.padEnd(20)} ${lc.llmDetail ?? lc.llm}`)
    lines.push(`${sbIcon} ${'live:sandbox'.padEnd(20)} ${lc.sandboxDetail ?? lc.sandbox}`)
  }

  if (report.credChecks) {
    for (const cr of report.credChecks) {
      let icon = '[FAIL]'
      if (cr.status === 'ok') icon = '[ok]'
      else if (cr.status === 'skipped') icon = '[skip]'
      let detail = cr.status
      if (cr.status === 'missing') {
        let hint = ''
        if (cr.remediation !== undefined) hint = cr.remediation
        detail = `missing: ${cr.missingKeys.join(', ')}  hint: ${hint}`
      }
      lines.push(`${icon} ${`creds:${cr.providerId}`.padEnd(20)} ${detail}`)
    }
    lines.push(
      '[hint] coding-agent certification: agentskit-os coding-agent conformance --provider <id> [--json]',
    )
  }

  let liveFailed = 0
  if (report.liveChecks) {
    if (report.liveChecks.llm === 'fail') liveFailed += 1
    if (report.liveChecks.sandbox === 'fail') liveFailed += 1
  }
  const credFailed = report.credChecks ? report.credChecks.filter((c) => c.status === 'missing').length : 0
  const totalFailed = report.failed + liveFailed + credFailed

  let summary = `\n${totalFailed} check(s) failed`
  if (totalFailed === 0) summary = `\nall checks passed (cli ${CLI_VERSION})`

  const out = `${lines.join('\n')}${summary}\n`
  return {
    code: totalFailed === 0 ? 0 : 1,
    stdout: totalFailed === 0 ? out : '',
    stderr: totalFailed === 0 ? '' : out,
  }
}

const collectProvider = (value: string, previous: string[]): string[] => [...previous, value]

type DoctorCliOpts = {
  live?: boolean
  creds?: boolean
  airGap?: boolean
  provider: string[]
  envPrefix?: string
  secretsFile?: string
}

const buildDoctorProgram = (
  liveOpts?: DoctorLiveOpts,
): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('doctor')
    .description(
      'agentskit-os doctor — Diagnose CLI environment: node version, platform, linked os-core, AGENTSKITOS_HOME. Exits 0 when all critical checks pass, 1 otherwise.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .option('--live', 'Also run live LLM probe (10s timeout) and sandbox round-trip (5s timeout). Adapters are injected by the host via createDoctor().')
    .option('--creds', 'Run credential presence checks against BUILTIN_PROVIDERS (no secret values printed).')
    .option('--air-gap', 'When combined with --creds, skips cloud providers.')
    .option('--provider <id>', 'Restrict creds check to one provider id (repeatable).', collectProvider, [])
    .option('--env-prefix <pfx>', 'Vault env-var prefix (default AGENTSKITOS_).')
    .option(
      '--secrets-file <path>',
      'When used with --creds, merge KEY names from this dotenv file into presence checks.',
    )
    .action(async (opts: DoctorCliOpts) => {
      const live = opts.live === true
      const providers = opts.provider ?? []
      let extraKeys: Set<string> | undefined
      if (opts.creds && opts.secretsFile) {
        try {
          const raw = await readFile(opts.secretsFile, 'utf8')
          extraKeys = new Set(parseLocalCredentialLines(raw).keys())
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          result.current = { code: 2, stdout: '', stderr: `error: cannot read --secrets-file: ${msg}\n` }
          return
        }
      }
      const credOpts: DoctorCredOpts | false = opts.creds
        ? {
            ...(opts.airGap === true ? { airGapped: true } : {}),
            ...(providers.length > 0 ? { providers } : {}),
            ...(opts.envPrefix ? { envPrefix: opts.envPrefix } : {}),
            ...(extraKeys ? { extraPresentKeys: extraKeys } : {}),
          }
        : false
      const report = await runDoctor(live, live ? liveOpts : undefined, credOpts)
      result.current = formatReport(report)
    })

  return { program, result }
}

/**
 * Factory for the doctor command, allowing dependency injection of live
 * probe adapters for testing without importing provider SDKs.
 */
export const createDoctor = (liveOpts?: DoctorLiveOpts): CliCommand => ({
  name: 'doctor',
  summary: 'Diagnose CLI environment + linked package versions',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildDoctorProgram(liveOpts)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
})

/** Default doctor command — live checks skipped unless adapters injected at runtime. */
export const doctor: CliCommand = createDoctor()
