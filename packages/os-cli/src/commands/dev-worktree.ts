import { resolve } from 'node:path'
import { createDevOrchestratorWorktreeManager } from '@agentskit/os-dev-orchestrator'
import type { CliCommand, CliExit } from '../types.js'

const help = `agentskit-os dev worktree <add|remove> [options]

Manage git worktrees for isolated agent / feature checkouts.

Subcommands:
  add     Create a new worktree and branch
  remove  Remove a worktree directory (--force on git side)

add options:
  --repo <path>        Git repository root (default: current directory)
  --path <path>        Absolute or relative path for the new worktree (required)
  --branch <name>      Branch name to create (required)
  --start-point <ref>  Optional base ref/commit for the new branch

remove options:
  --repo <path>        Git repository root (default: current directory)
  --path <path>        Worktree path to remove (required)
`

export const devWorktree: CliCommand = {
  name: 'dev worktree',
  summary: 'Add or remove git worktrees for isolated checkouts',
  run: async (argv): Promise<CliExit> => {
    if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    const sub = argv[0]
    if (sub !== 'add' && sub !== 'remove') {
      return { code: 2, stdout: '', stderr: `${help}\nerror: expected add|remove, got "${sub}"\n` }
    }

    let repo = process.cwd()
    let wtPath: string | undefined
    let branch: string | undefined
    let startPoint: string | undefined

    for (let i = 1; i < argv.length; i++) {
      const a = argv[i]
      if (a === '--repo' && argv[i + 1]) {
        repo = resolve(argv[i + 1]!)
        i++
      } else if (a === '--path' && argv[i + 1]) {
        wtPath = resolve(argv[i + 1]!)
        i++
      } else if (a === '--branch' && argv[i + 1]) {
        branch = argv[i + 1]!
        i++
      } else if (a === '--start-point' && argv[i + 1]) {
        startPoint = argv[i + 1]!
        i++
      }
    }

    if (!wtPath) {
      return { code: 2, stdout: '', stderr: `${help}\nerror: --path is required\n` }
    }

    const mgr = createDevOrchestratorWorktreeManager({ repoRoot: repo })

    if (sub === 'add') {
      if (!branch) {
        return { code: 2, stdout: '', stderr: `${help}\nerror: --branch is required for add\n` }
      }
      const r = await mgr.add({
        path: wtPath,
        branch,
        ...(startPoint ? { startPoint } : {}),
      })
      if (!r.ok) {
        return { code: 1, stdout: '', stderr: `${r.error}\n` }
      }
      return { code: 0, stdout: `worktree added: ${wtPath} (branch ${branch})\n`, stderr: '' }
    }

    const r = await mgr.remove(wtPath)
    if (!r.ok) {
      return { code: 1, stdout: '', stderr: `${r.error}\n` }
    }
    return { code: 0, stdout: `worktree removed: ${wtPath}\n`, stderr: '' }
  },
}
