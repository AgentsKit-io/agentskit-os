import { describe, expect, it } from 'vitest'
import {
  akToolToMcp,
  buildMcpToolCall,
  createMcpBridge,
  mcpToolToAk,
} from '../src/bridge.js'

const ak = {
  id: 'tools.git.diff',
  description: 'Compute diff between two refs',
  inputSchema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } },
}

describe('MCP bridge primitives (#84)', () => {
  it('akToolToMcp + mcpToolToAk round-trip', () => {
    const mcp = akToolToMcp(ak)
    expect(mcp.name).toBe('tools.git.diff')
    const back = mcpToolToAk(mcp)
    expect(back).toEqual(ak)
  })

  it('publish surfaces conflict on duplicate id', () => {
    const b = createMcpBridge()
    expect(b.publish(ak)).toBe('registered')
    expect(b.publish(ak)).toBe('conflict')
  })

  it('importRemote returns AK descriptors and tracks them in listImported', () => {
    const b = createMcpBridge()
    const imported = b.importRemote([{ name: 'sql.query', description: 'run sql', inputSchema: {} }])
    expect(imported[0]?.id).toBe('sql.query')
    expect(b.listImported()).toHaveLength(1)
  })

  it('buildMcpToolCall freezes arguments shape', () => {
    const call = buildMcpToolCall('tools.echo', { msg: 'hi' })
    expect(call.name).toBe('tools.echo')
    expect(call.arguments).toEqual({ msg: 'hi' })
  })
})
