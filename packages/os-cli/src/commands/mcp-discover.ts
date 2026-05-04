import { discoverMcpServers } from '@agentskit/os-mcp-bridge'
import type { McpServerDefinition } from '@agentskit/os-mcp-bridge'
import type { CliCommand, CliExit } from '../types.js'

const help = `agentskit-os mcp discover [--json] [--no-defaults] [--file <path>]

Scans common MCP config locations (e.g. ~/.cursor/mcp.json) and prints
discovered MCP server definitions (command/args/env + source file).

Options:
  --json             Emit JSON
  --no-defaults      Do not scan default locations (only explicit --file paths)
  --file <path>      Additional JSON file to include (repeatable)
`

export const mcpDiscover: CliCommand = {
  name: 'mcp discover',
  summary: 'Discover MCP server definitions from local agent config files',
  run: async (argv): Promise<CliExit> => {
    if (argv[0] === '--help' || argv[0] === '-h') {
      return { code: 2, stdout: '', stderr: help }
    }

    const asJson = argv.includes('--json')
    const noDefaults = argv.includes('--no-defaults')
    const extra: string[] = []
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--file' && argv[i + 1]) {
        extra.push(argv[i + 1]!)
        i++
      }
    }

    const defs = await discoverMcpServers({
      includeDefaultPaths: !noDefaults,
      extraConfigPaths: extra,
    })
    if (asJson) {
      return { code: 0, stdout: `${JSON.stringify(defs, null, 2)}\n`, stderr: '' }
    }

    const lines = defs.map((d: McpServerDefinition) => {
      const argStr = d.args.length ? ` ${d.args.join(' ')}` : ''
      return `${d.name}\t${d.transport}\t${d.command}${argStr}\t(src ${d.sourcePath})`
    })
    const out = lines.length ? `${lines.join('\n')}\n` : 'no MCP servers discovered\n'
    return { code: 0, stdout: out, stderr: '' }
  },
}
