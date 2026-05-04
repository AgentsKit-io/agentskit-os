import { Command } from 'commander'
import { runConformance } from '@agentskit/os-core'
import {
  BUILTIN_CODING_AGENT_IDS,
  createBuiltinCodingAgentProvider,
  isBuiltinCodingAgentId,
} from '@agentskit/os-coding-agents'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

type ConformanceOpts = { provider: string; json?: boolean }

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('coding-agent conformance')
    .description('Run os-core conformance probe against a built-in coding-agent CLI.')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .requiredOption(
      '--provider <id>',
      `built-in provider (${BUILTIN_CODING_AGENT_IDS.join(', ')})`,
    )
    .option('--json', 'print ConformanceReport as JSON', false)
    .action(async (opts: ConformanceOpts) => {
      const pid = opts.provider
      if (!isBuiltinCodingAgentId(pid)) {
        program.error(`unknown provider "${pid}"`, { exitCode: 2 })
      } else {
        const p = createBuiltinCodingAgentProvider(pid)
        const report = await runConformance(p)
        if (opts.json) {
          const out = `${JSON.stringify(report, null, 2)}\n`
          result.current = report.certified
            ? { code: 0, stdout: out, stderr: '' }
            : { code: 1, stdout: '', stderr: out }
          return
        }
        const lines = report.results.map(
          (r) => `${r.passed ? '[ok]' : '[FAIL]'} ${r.check}${r.detail ? ` — ${r.detail}` : ''}`,
        )
        const summary =
          `provider: ${report.providerId}\npassed: ${report.passed}  failed: ${report.failed}  certified: ${report.certified}\n`
        const text = `${lines.join('\n')}\n\n${summary}`
        result.current = report.certified
          ? { code: 0, stdout: text, stderr: '' }
          : { code: 1, stdout: '', stderr: text }
      }
    })

  return { program, result }
}

export const codingAgentConformance: CliCommand = {
  name: 'coding-agent conformance',
  summary: 'Run conformance checks against a built-in coding-agent CLI',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
