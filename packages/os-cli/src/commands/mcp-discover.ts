import { Command } from 'commander'
import { discoverMcpServers } from '@agentskit/os-mcp-bridge'
import type { McpServerDefinition } from '@agentskit/os-mcp-bridge'
import { runCommander } from '../cli/commander-dispatch.js'
import type { CliCommand, CliExit } from '../types.js'

type McpDiscoverOpts = {
  json?: boolean
  /** Present as false when `--no-defaults` is passed (Commander negated option → attribute `defaults`). */
  defaults?: boolean
  file?: string[]
}

const collectFile = (value: string, previous: string[] | undefined): string[] => [...(previous ?? []), value]

const buildProgram = (): { program: Command; result: { current?: CliExit } } => {
  const result: { current?: CliExit } = {}
  const program = new Command()
  program
    .name('mcp discover')
    .description(
      'Scan common MCP config locations (e.g. ~/.cursor/mcp.json) and print discovered server definitions.',
    )
    .helpOption('-h, --help', 'display help')
    .configureHelp({ helpWidth: 96 })
    .option('--json', 'emit JSON', false)
    .option('--no-defaults', 'do not scan default locations (only --file paths)')
    .option('--file <path>', 'additional JSON config (repeatable)', collectFile, [])
    .action(async (opts: McpDiscoverOpts) => {
      const extra = opts.file ?? []
      const defs = await discoverMcpServers({
        includeDefaultPaths: opts.defaults !== false,
        extraConfigPaths: extra,
      })
      if (opts.json) {
        result.current = { code: 0, stdout: `${JSON.stringify(defs, null, 2)}\n`, stderr: '' }
        return
      }
      const lines = defs.map((d: McpServerDefinition) => {
        const argStr = d.args.length ? ` ${d.args.join(' ')}` : ''
        return `${d.name}\t${d.transport}\t${d.command}${argStr}\t(src ${d.sourcePath})`
      })
      const out = lines.length ? `${lines.join('\n')}\n` : 'no MCP servers discovered\n'
      result.current = { code: 0, stdout: out, stderr: '' }
    })

  return { program, result }
}

export const mcpDiscover: CliCommand = {
  name: 'mcp discover',
  summary: 'Discover MCP server definitions from local agent config files',
  run: async (argv): Promise<CliExit> => {
    const { program, result } = buildProgram()
    const parsed = await runCommander(program, argv)
    if (parsed.code !== 0) {
      return parsed
    }
    return result.current ?? { code: parsed.code, stdout: parsed.stdout, stderr: parsed.stderr }
  },
}
