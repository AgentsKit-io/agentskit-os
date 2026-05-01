import { describe, expect, it } from 'vitest'
import { parsePluginConfig, safeParsePluginConfig } from '../../src/schema/plugin.js'

const base = {
  id: 'web-search',
  name: 'Web Search',
  version: '1.2.3',
  source: 'npm:@agentskit/tool-web-search',
  capabilities: ['tool'],
}

describe('PluginConfig', () => {
  describe('accept', () => {
    it('parses minimal npm source', () => {
      const p = parsePluginConfig(base)
      expect(p.enabled).toBe(true)
    })

    it('parses github source with ref', () => {
      const p = parsePluginConfig({ ...base, source: 'github:AgentsKit-io/tool-x#main' })
      expect(p.source.startsWith('github:')).toBe(true)
    })

    it('parses marketplace and file sources', () => {
      expect(parsePluginConfig({ ...base, source: 'marketplace:tool-web-search' }).id).toBe('web-search')
      expect(parsePluginConfig({ ...base, source: 'file:./local-plugin' }).id).toBe('web-search')
    })

    it('parses with signature', () => {
      const p = parsePluginConfig({
        ...base,
        signature: {
          algorithm: 'ed25519',
          publicKey: 'A'.repeat(64),
          signature: 'B'.repeat(64),
        },
      })
      expect(p.signature?.algorithm).toBe('ed25519')
    })

    it('parses prerelease semver', () => {
      const p = parsePluginConfig({ ...base, version: '1.0.0-beta.1' })
      expect(p.version).toBe('1.0.0-beta.1')
    })
  })

  describe('reject', () => {
    it('rejects non-semver version', () => {
      expect(safeParsePluginConfig({ ...base, version: '1.2' }).success).toBe(false)
    })

    it('rejects unknown source scheme', () => {
      expect(safeParsePluginConfig({ ...base, source: 'http://x.com/plugin' }).success).toBe(false)
    })

    it('rejects empty capabilities', () => {
      expect(safeParsePluginConfig({ ...base, capabilities: [] }).success).toBe(false)
    })

    it('rejects unknown capability', () => {
      expect(safeParsePluginConfig({ ...base, capabilities: ['malware'] }).success).toBe(false)
    })

    it('rejects short signature', () => {
      expect(
        safeParsePluginConfig({
          ...base,
          signature: { algorithm: 'ed25519', publicKey: 'short', signature: 'short' },
        }).success,
      ).toBe(false)
    })

    it('throws on parsePluginConfig with invalid input', () => {
      expect(() => parsePluginConfig({})).toThrow()
    })
  })
})
