import type { CliCommand, CliExit, CliIo } from './types.js'
import { configValidate } from './commands/config-validate.js'
import { configExplain } from './commands/config-explain.js'
import { configDiff } from './commands/config-diff.js'
import { configMigrate } from './commands/config-migrate.js'
import { doctor } from './commands/doctor.js'
import { init } from './commands/init.js'
import { wizard } from './commands/wizard.js'
import { run } from './commands/run.js'
import { lock } from './commands/lock.js'
import { importCmd } from './commands/import.js'
import { newCmd } from './commands/new.js'
import { publish } from './commands/publish.js'
import { deploy } from './commands/deploy.js'
import { version } from './commands/version.js'
import { sync } from './commands/sync.js'
import { agentPromote } from './commands/agent-promote.js'
import { agentRegister } from './commands/agent-register.js'
import { agentList } from './commands/agent-list.js'
import { agentBump, agentDiff, agentVersionList } from './commands/agent-version.js'
import { agentChangelog } from './commands/agent-changelog.js'
import { flowExport, flowImportJson } from './commands/flow-json.js'
import { flowNew } from './commands/flow-new.js'
import { creds } from './commands/creds.js'
import { telemetry } from './commands/telemetry.js'
import { mcpDiscover } from './commands/mcp-discover.js'
import { triggerPreset } from './commands/trigger-preset.js'
import { devIssuePr } from './commands/dev-issue-pr.js'
import { devWorktree } from './commands/dev-worktree.js'
import { codingAgentBenchmark } from './commands/coding-agent-benchmark.js'
import { codingAgentConformance } from './commands/coding-agent-conformance.js'
import { codingAgentDelegate } from './commands/coding-agent-delegate.js'
import { snapshotSchedule } from './commands/snapshot-schedule.js'
import { snapshotRetention } from './commands/snapshot-retention.js'

export const COMMANDS: readonly CliCommand[] = [
  init,
  wizard,
  newCmd,
  importCmd,
  run,
  lock,
  sync,
  publish,
  deploy,
  configValidate,
  configExplain,
  configDiff,
  configMigrate,
  doctor,
  agentRegister,
  agentList,
  agentBump,
  agentDiff,
  agentVersionList,
  agentChangelog,
  flowExport,
  flowImportJson,
  flowNew,
  agentPromote,
  creds,
  telemetry,
  mcpDiscover,
  triggerPreset,
  devWorktree,
  devIssuePr,
  codingAgentConformance,
  codingAgentBenchmark,
  codingAgentDelegate,
  snapshotSchedule,
  snapshotRetention,
  version,
]

const help = `agentskit-os <command> [args]

Commands:
${COMMANDS.map((c) => `  ${c.name.padEnd(20)} ${c.summary}`).join('\n')}

Run \`agentskit-os <command> --help\` for command-specific help.
`

export const route = async (argv: readonly string[], io?: CliIo): Promise<CliExit> => {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return { code: 0, stdout: help, stderr: '' }
  }
  if (argv[0] === '--version' || argv[0] === '-v') {
    return version.run([], io)
  }

  // Two-segment commands: "config validate"
  const twoToken = `${argv[0] ?? ''} ${argv[1] ?? ''}`.trim()
  const twoMatch = COMMANDS.find((c) => c.name === twoToken)
  if (twoMatch) return twoMatch.run(argv.slice(2), io)

  const oneMatch = COMMANDS.find((c) => c.name === argv[0])
  if (oneMatch) return oneMatch.run(argv.slice(1), io)

  return {
    code: 2,
    stdout: '',
    stderr: `error: unknown command "${argv[0]}"\n\n${help}`,
  }
}
