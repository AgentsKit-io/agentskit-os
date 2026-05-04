import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverMcpServers, extractMcpServersFromJson } from '../src/index.js'

describe('mcp discovery', () => {
  it('extracts stdio servers from mcpServers map', () => {
    const defs = extractMcpServersFromJson(
      {
        mcpServers: {
          demo: { command: 'node', args: ['server.js'], env: { FOO: 'bar' } },
        },
      },
      '/tmp/mcp.json',
    )
    expect(defs).toHaveLength(1)
    expect(defs[0]?.name).toBe('demo')
    expect(defs[0]?.command).toBe('node')
    expect(defs[0]?.args).toEqual(['server.js'])
    expect(defs[0]?.env.FOO).toBe('bar')
  })

  it('discovers from an explicit file path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-discover-'))
    const file = join(dir, 'mcp.json')
    await writeFile(
      file,
      JSON.stringify({
        mcpServers: {
          a: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'] },
          b: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'] },
        },
      }),
      'utf8',
    )

    const defs = await discoverMcpServers({ includeDefaultPaths: false, extraConfigPaths: [file] })
    // identical commands args/env should dedupe to 1
    expect(defs).toHaveLength(1)
  })

  it('skips missing files gracefully', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mcp-discover-'))
    const nested = join(dir, 'nested')
    await mkdir(nested, { recursive: true })
    const defs = await discoverMcpServers({ homeDir: nested })
    expect(defs).toEqual([])
  })
})
