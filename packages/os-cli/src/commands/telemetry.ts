import {
  TelemetryConsent,
  type TelemetryEvent,
  type TelemetryConsentState,
} from '@agentskit/os-core'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const help = `agentskit-os telemetry <subcommand>

Anonymous, opt-in usage telemetry. No prompts, no agent IDs, no error
messages — only verb names, version strings, run mode, node kinds, and
stable error codes (see ADR-0022).

Subcommands:
  status                   show current consent state + install id
  enable                   set consent to enabled
  disable                  set consent to disabled
  export [--json|--csv]    print stored events in chosen format
                           options: --since <ISO8601>  --dry-run

Common flags:
  --workspace-root <path>  override the workspace runtime root
                           (defaults to ./.agentskitos)

Exit codes: 0 ok, 2 usage error, 8 not initialized.
`

const CONSENT_PATH = 'telemetry/consent.json'
const EVENTS_PATH = 'telemetry/events.jsonl'

type Sub = 'status' | 'enable' | 'disable' | 'export'
type Format = 'json' | 'csv'

type Args = {
  sub?: Sub
  workspaceRoot: string
  format: Format
  since?: string
  dryRun: boolean
  usage?: string
}

const parseArgs = (argv: readonly string[]): Args => {
  const out: Args = { workspaceRoot: '.agentskitos', format: 'json', dryRun: false }
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === '--help' || a === '-h') return { ...out, usage: 'help' }
    if (a === '--json') { out.format = 'json'; i++; continue }
    if (a === '--csv') { out.format = 'csv'; i++; continue }
    if (a === '--dry-run') { out.dryRun = true; i++; continue }
    if (a === '--since' || a === '--workspace-root') {
      const v = argv[i + 1]
      if (!v || v.startsWith('--')) return { ...out, usage: `${a} requires a value` }
      if (a === '--since') out.since = v
      else out.workspaceRoot = v
      i += 2
      continue
    }
    if (a === 'status' || a === 'enable' || a === 'disable' || a === 'export') {
      if (out.sub) return { ...out, usage: `unexpected positional "${a}"` }
      out.sub = a
      i++
      continue
    }
    return { ...out, usage: `unknown argument "${a}"` }
  }
  if (!out.sub) return { ...out, usage: 'missing subcommand (status | enable | disable | export)' }
  return out
}

const consentPath = (root: string) => `${root}/${CONSENT_PATH}`
const eventsPath = (root: string) => `${root}/${EVENTS_PATH}`

const newInstallId = (): string =>
  // RFC 4122 v4-shaped (uses Math.random — fine for anon id, not crypto).
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

const loadConsent = async (io: CliIo, root: string) => {
  const path = consentPath(root)
  if (!(await io.exists(path))) {
    return { state: 'unset' as TelemetryConsentState, installId: undefined as string | undefined }
  }
  const raw = await io.readFile(path)
  try {
    return TelemetryConsent.parse(JSON.parse(raw))
  } catch {
    return { state: 'unset' as TelemetryConsentState, installId: undefined as string | undefined }
  }
}

const saveConsent = async (io: CliIo, root: string, state: TelemetryConsentState, prevInstallId?: string): Promise<{ installId: string }> => {
  const installId = prevInstallId ?? newInstallId()
  const consent = {
    state,
    decidedAt: new Date().toISOString(),
    installId,
  }
  await io.mkdir(`${root}/telemetry`)
  await io.writeFile(consentPath(root), `${JSON.stringify(consent, null, 2)}\n`)
  return { installId }
}

const readEvents = async (io: CliIo, root: string): Promise<TelemetryEvent[]> => {
  const path = eventsPath(root)
  if (!(await io.exists(path))) return []
  const raw = await io.readFile(path)
  const events: TelemetryEvent[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      events.push(JSON.parse(line) as TelemetryEvent)
    } catch {
      // skip corrupt lines
    }
  }
  return events
}

const csvEscape = (v: unknown): string => {
  const s = v === undefined || v === null ? '' : String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

const toCsv = (events: readonly TelemetryEvent[]): string => {
  const cols = ['at', 'kind', 'verb', 'runMode', 'nodeKind', 'errorCode', 'durationMs', 'exitCode', 'cliVersion', 'os', 'nodeVersion', 'installId']
  const rows = [cols.join(',')]
  for (const e of events) {
    rows.push(cols.map((c) => csvEscape((e as unknown as Record<string, unknown>)[c])).join(','))
  }
  return `${rows.join('\n')}\n`
}

const filterSince = (events: readonly TelemetryEvent[], since?: string): readonly TelemetryEvent[] => {
  if (!since) return events
  const cutoff = new Date(since).getTime()
  if (Number.isNaN(cutoff)) return events
  return events.filter((e) => new Date(e.at).getTime() >= cutoff)
}

export const telemetry: CliCommand = {
  name: 'telemetry',
  summary: 'Manage anonymous opt-in usage telemetry',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const args = parseArgs(argv)
    if (args.usage === 'help') return { code: 2, stdout: '', stderr: help }
    if (args.usage) return { code: 2, stdout: '', stderr: `error: ${args.usage}\n\n${help}` }

    if (args.sub === 'status') {
      const c = await loadConsent(io, args.workspaceRoot)
      return {
        code: 0,
        stdout: `state: ${c.state}\ninstallId: ${c.installId ?? '(none)'}\n`,
        stderr: '',
      }
    }

    if (args.sub === 'enable' || args.sub === 'disable') {
      const prev = await loadConsent(io, args.workspaceRoot)
      const { installId } = await saveConsent(io, args.workspaceRoot, args.sub === 'enable' ? 'enabled' : 'disabled', prev.installId)
      return {
        code: 0,
        stdout: `telemetry ${args.sub}d (installId=${installId})\n`,
        stderr: '',
      }
    }

    // export
    const events = filterSince(await readEvents(io, args.workspaceRoot), args.since)
    if (args.dryRun) {
      const counts: Record<string, number> = {}
      for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1
      const lines = [
        `would export ${events.length} event(s)${args.since ? ` since ${args.since}` : ''}:`,
        ...Object.entries(counts).map(([k, n]) => `  ${k}: ${n}`),
        `format: ${args.format}`,
        `(no values printed in dry-run mode)`,
      ]
      return { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
    }
    const stdout = args.format === 'csv' ? toCsv(events) : `${JSON.stringify(events)}\n`
    return { code: 0, stdout, stderr: '' }
  },
}
