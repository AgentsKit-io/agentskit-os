import { describe, expect, it } from 'vitest'
import type { SandboxRuntime } from '@agentskit/os-core'
import { SandboxRegistry } from '../src/index.js'

const fakeRuntime = (level: SandboxRuntime['level'], name: string): SandboxRuntime => ({
  level,
  name,
  spawn: async () => ({ pid: 1, kill: async () => undefined }),
})

describe('SandboxRegistry', () => {
  it('includes built-ins by default', () => {
    const r = new SandboxRegistry()
    expect(r.has('none')).toBe(true)
    expect(r.has('process')).toBe(true)
    expect(r.list()).toContain('none')
    expect(r.list()).toContain('process')
  })

  it('omits built-ins when includeBuiltins=false', () => {
    const r = new SandboxRegistry(false)
    expect(r.has('none')).toBe(false)
    expect(r.has('process')).toBe(false)
  })

  it('register adds a runtime by level', () => {
    const r = new SandboxRegistry(false)
    r.register(fakeRuntime('container', 'docker'))
    expect(r.has('container')).toBe(true)
    expect(r.get('container')?.name).toBe('docker')
  })

  it('register replaces existing runtime at same level', () => {
    const r = new SandboxRegistry(false)
    r.register(fakeRuntime('vm', 'firecracker'))
    r.register(fakeRuntime('vm', 'qemu'))
    expect(r.get('vm')?.name).toBe('qemu')
  })

  it('resolveOrThrow returns runtime', () => {
    const r = new SandboxRegistry()
    expect(r.resolveOrThrow('process').level).toBe('process')
  })

  it('resolveOrThrow throws on missing level', () => {
    const r = new SandboxRegistry(false)
    expect(() => r.resolveOrThrow('container')).toThrow(/no sandbox runtime/i)
  })
})
