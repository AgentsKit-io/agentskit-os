import { resolve } from 'node:path'
import { Command } from 'commander'
import { createDevOrchestratorWorktreeManager } from '@agentskit/os-dev-orchestrator'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('dev worktree')
    .description('Add or remove git worktrees for isolated agent / feature checkouts.')
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })

  program
    .command('add')
    .description('Create a new worktree and branch')
    .requiredOption('--path <path>', 'directory for the new worktree')
    .requiredOption('--branch <name>', 'branch name to create')
    .option('--repo <path>', 'git repository root', process.cwd())
    .option('--start-point <ref>', 'optional base ref or commit for the new branch')
    .action(async (opts: { path: string; branch: string; repo: string; startPoint?: string }) => {
      const repo = resolve(opts.repo)
      const wtPath = resolve(opts.path)
      const mgr = createDevOrchestratorWorktreeManager({ repoRoot: repo })
      const r = await mgr.add({
        path: wtPath,
        branch: opts.branch,
        ...(opts.startPoint ? { startPoint: opts.startPoint } : {}),
      })
      if (!r.ok) {
        result.current = { code: 1, stdout: '', stderr: `${r.error}\n` }
        return
      }
      result.current = {
        code: 0,
        stdout: `worktree added: ${wtPath} (branch ${opts.branch})\n`,
        stderr: '',
      }
    })

  program
    .command('remove')
    .description('Remove a worktree directory')
    .requiredOption('--path <path>', 'worktree path to remove')
    .option('--repo <path>', 'git repository root', process.cwd())
    .action(async (opts: { path: string; repo: string }) => {
      const mgr = createDevOrchestratorWorktreeManager({ repoRoot: resolve(opts.repo) })
      const wtPath = resolve(opts.path)
      const r = await mgr.remove(wtPath)
      if (!r.ok) {
        result.current = { code: 1, stdout: '', stderr: `${r.error}\n` }
        return
      }
      result.current = { code: 0, stdout: `worktree removed: ${wtPath}\n`, stderr: '' }
    })

  return { program, result }
}

export const devWorktree: CliCommand = {
  name: 'dev worktree',
  summary: 'Add or remove git worktrees for isolated checkouts',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
