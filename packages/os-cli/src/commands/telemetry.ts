import { Command } from 'commander'
import {
  TelemetryConsent,
  type TelemetryEvent,
  type TelemetryConsentState,
} from '@agentskit/os-core'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit, CliIo } from '../types.js'
import { defaultIo } from '../io.js'

const CONSENT_PATH = 'telemetry/consent.json'
const EVENTS_PATH = 'telemetry/events.jsonl'

type Format = 'json' | 'csv'

const consentPath = (root: string) => `${root}/${CONSENT_PATH}`
const eventsPath = (root: string) => `${root}/${EVENTS_PATH}`

const newInstallId = (): string =>
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

const saveConsent = async (
  io: CliIo,
  root: string,
  state: TelemetryConsentState,
  prevInstallId?: string,
): Promise<{ installId: string }> => {
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

const buildProgram = (io: CliIo): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('telemetry')
    .description(
      'agentskit-os telemetry — Anonymous opt-in usage telemetry (ADR-0022). Subcommands: status, enable, disable, export.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })

  program
    .command('status')
    .description('Show current consent state + install id')
    .option('--workspace-root <path>', 'override the workspace runtime root', '.agentskitos')
    .action(async (opts: { workspaceRoot?: string }) => {
      const root = opts.workspaceRoot ?? '.agentskitos'
      const c = await loadConsent(io, root)
      result.current = {
        code: 0,
        stdout: `state: ${c.state}\ninstallId: ${c.installId ?? '(none)'}\n`,
        stderr: '',
      }
    })

  program
    .command('enable')
    .description('Set consent to enabled')
    .option('--workspace-root <path>', 'override the workspace runtime root', '.agentskitos')
    .action(async (opts: { workspaceRoot?: string }) => {
      const root = opts.workspaceRoot ?? '.agentskitos'
      const prev = await loadConsent(io, root)
      const { installId } = await saveConsent(io, root, 'enabled', prev.installId)
      result.current = {
        code: 0,
        stdout: `telemetry enabled (installId=${installId})\n`,
        stderr: '',
      }
    })

  program
    .command('disable')
    .description('Set consent to disabled')
    .option('--workspace-root <path>', 'override the workspace runtime root', '.agentskitos')
    .action(async (opts: { workspaceRoot?: string }) => {
      const root = opts.workspaceRoot ?? '.agentskitos'
      const prev = await loadConsent(io, root)
      const { installId } = await saveConsent(io, root, 'disabled', prev.installId)
      result.current = {
        code: 0,
        stdout: `telemetry disabled (installId=${installId})\n`,
        stderr: '',
      }
    })

  program
    .command('export')
    .description('Print stored events (JSON by default; use --csv for CSV)')
    .option('--workspace-root <path>', 'override the workspace runtime root', '.agentskitos')
    .option('--json', 'emit JSON (default when --csv is not set)', false)
    .option('--csv', 'emit CSV', false)
    .option('--since <ISO8601>', 'only events on or after this timestamp')
    .option('--dry-run', 'print event counts only', false)
    .action(
      async (opts: {
        workspaceRoot?: string
        json?: boolean
        csv?: boolean
        since?: string
        dryRun?: boolean
      }) => {
        const root = opts.workspaceRoot ?? '.agentskitos'
        const format: Format = opts.csv ? 'csv' : 'json'
        const events = filterSince(await readEvents(io, root), opts.since)
        if (opts.dryRun) {
          const counts: Record<string, number> = {}
          for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1
          const lines = [
            `would export ${events.length} event(s)${opts.since ? ` since ${opts.since}` : ''}:`,
            ...Object.entries(counts).map(([k, n]) => `  ${k}: ${n}`),
            `format: ${format}`,
            `(no values printed in dry-run mode)`,
          ]
          result.current = { code: 0, stdout: `${lines.join('\n')}\n`, stderr: '' }
          return
        }
        const stdout = format === 'csv' ? toCsv(events) : `${JSON.stringify(events)}\n`
        result.current = { code: 0, stdout, stderr: '' }
      },
    )

  return { program, result }
}

export const telemetry: CliCommand = {
  name: 'telemetry',
  summary: 'Manage anonymous opt-in usage telemetry',
  run: async (argv, io: CliIo = defaultIo): Promise<CliExit> => {
    const { program, result } = buildProgram(io)
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
