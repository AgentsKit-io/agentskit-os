import { describe, expect, it } from 'vitest'
import { parsePluginConfig, safeParsePluginConfig } from '../../src/schema/plugin.js'

const base = {
  id: 'web-search',
  name: 'Web Search',
  version: '1.2.3',
  source: 'npm:@agentskit/tool-web-search',
  contributes: ['tool'],
}

describe('PluginConfig', () => {
  describe('accept', () => {
    it('parses minimal npm source', () => {
      const p = parsePluginConfig(base)
      expect(p.enabled).toBe(true)
      expect(p.permissions).toEqual([])
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

    it('parses with permissions array', () => {
      const p = parsePluginConfig({
        ...base,
        permissions: [
          {
            resource: 'net:fetch:api.github.com',
            actions: ['invoke'],
            reason: 'Fetch and comment on PRs',
            required: true,
          },
          {
            resource: 'vault:github_token',
            actions: ['read'],
            reason: 'Authenticate to GitHub API',
          },
        ],
      })
      expect(p.permissions).toHaveLength(2)
      expect(p.permissions[1].required).toBe(true)
    })

    it('parses permission with constraints', () => {
      const p = parsePluginConfig({
        ...base,
        permissions: [
          {
            resource: 'flow:*',
            actions: ['trigger'],
            reason: 'Allow webhook to start flows',
            constraints: { rateLimit: { perMin: 60 } },
            required: false,
          },
        ],
      })
      expect(p.permissions[0].constraints?.rateLimit?.perMin).toBe(60)
    })
  })

  describe('reject', () => {
    it('rejects non-semver version', () => {
      expect(safeParsePluginConfig({ ...base, version: '1.2' }).success).toBe(false)
    })

    it('rejects unknown source scheme', () => {
      expect(safeParsePluginConfig({ ...base, source: 'http://x.com/plugin' }).success).toBe(false)
    })

    it('rejects empty contributes', () => {
      expect(safeParsePluginConfig({ ...base, contributes: [] }).success).toBe(false)
    })

    it('rejects unknown contribution', () => {
      expect(safeParsePluginConfig({ ...base, contributes: ['malware'] }).success).toBe(false)
    })

    it('rejects legacy `capabilities` field (renamed to contributes)', () => {
      const { contributes, ...without } = base
      expect(safeParsePluginConfig({ ...without, capabilities: ['tool'] }).success).toBe(false)
    })

    it('rejects short signature', () => {
      expect(
        safeParsePluginConfig({
          ...base,
          signature: { algorithm: 'ed25519', publicKey: 'short', signature: 'short' },
        }).success,
      ).toBe(false)
    })

    it('rejects permission with bad resource format', () => {
      expect(
        safeParsePluginConfig({
          ...base,
          permissions: [{ resource: 'no-colon', actions: ['read'], reason: 'x' }],
        }).success,
      ).toBe(false)
    })

    it('rejects permission with empty actions', () => {
      expect(
        safeParsePluginConfig({
          ...base,
          permissions: [{ resource: 'vault:k', actions: [], reason: 'x' }],
        }).success,
      ).toBe(false)
    })

    it('throws on parsePluginConfig with invalid input', () => {
      expect(() => parsePluginConfig({})).toThrow()
    })
  })
})
