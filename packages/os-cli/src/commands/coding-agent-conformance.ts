import { runConformance } from '@agentskit/os-core'
import {
  BUILTIN_CODING_AGENT_IDS,
  createBuiltinCodingAgentProvider,
  isBuiltinCodingAgentId,
} from '@agentskit/os-coding-agents'
import type { CliCommand, CliExit } from '../types.js'

const help = `agentskit-os coding-agent conformance --provider <id> [--json]

Runs the os-core conformance probe against a built-in coding-agent provider
(codex, claude-code, cursor, gemini). Requires the provider CLI installed locally.

Options:
  --provider <id>   Required. One of: ${BUILTIN_CODING_AGENT_IDS.join(', ')}
  --json            Print ConformanceReport as JSON
`

export const codingAgentConformance: CliCommand = {
  name: 'coding-agent conformance',
  summary: 'Run conformance checks against a built-in coding-agent CLI',
  run: async (argv): Promise<CliExit> => {
    if (argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    const asJson = argv.includes('--json')
    const args = argv.filter((x) => x !== '--json')

    let providerId: string | undefined
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--provider' && args[i + 1]) {
        providerId = args[i + 1]!
        i++
      }
    }

    if (!providerId) {
      return { code: 2, stdout: '', stderr: `${help}\nerror: --provider is required\n` }
    }
    if (!isBuiltinCodingAgentId(providerId)) {
      return {
        code: 2,
        stdout: '',
        stderr: `${help}\nerror: unknown provider "${providerId}"\n`,
      }
    }

    const p = createBuiltinCodingAgentProvider(providerId)
    const report = await runConformance(p)

    if (asJson) {
      const out = `${JSON.stringify(report, null, 2)}\n`
      return report.certified ? { code: 0, stdout: out, stderr: '' } : { code: 1, stdout: '', stderr: out }
    }

    const lines = report.results.map(
      (r) => `${r.passed ? '[ok]' : '[FAIL]'} ${r.check}${r.detail ? ` — ${r.detail}` : ''}`,
    )
    const summary =
      `provider: ${report.providerId}\npassed: ${report.passed}  failed: ${report.failed}  certified: ${report.certified}\n`
    const text = `${lines.join('\n')}\n\n${summary}`
    return report.certified
      ? { code: 0, stdout: text, stderr: '' }
      : { code: 1, stdout: '', stderr: text }
  },
}
