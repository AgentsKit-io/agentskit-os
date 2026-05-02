import { describe, expect, it } from 'vitest'
import { noneSandbox } from '../src/index.js'

describe('noneSandbox', () => {
  it('declares level + name', () => {
    expect(noneSandbox.level).toBe('none')
    expect(noneSandbox.name).toBe('in-process')
  })

  it('rejects spawn — not for external commands', async () => {
    await expect(noneSandbox.spawn({ command: 'ls', args: [] })).rejects.toThrow(
      /none.*level/i,
    )
  })
})
