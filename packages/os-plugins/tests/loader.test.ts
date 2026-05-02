import { describe, expect, it } from 'vitest'
import { PluginRegistry, type PluginConfig } from '@agentskit/os-core'
import {
  InMemoryManifestFetcher,
  filterDangerousPermissions,
  loadPlugin,
} from '../src/index.js'

const baseManifest = (over: Partial<PluginConfig> = {}): PluginConfig =>
  ({
    id: 'web-search',
    name: 'Web Search',
    version: '1.0.0',
    source: 'npm:@agentskit/tool-web-search',
    contributes: ['tool'],
    enabled: true,
    tags: [],
    permissions: [],
    ...over,
  }) as PluginConfig

describe('loadPlugin', () => {
  it('loads a clean manifest into registry', async () => {
    const fetcher = new InMemoryManifestFetcher()
    const manifest = baseManifest()
    fetcher.register(manifest.source, manifest, 'sha512:' + '0'.repeat(128))
    const registry = new PluginRegistry()
    const r = await loadPlugin(manifest.source, undefined, { fetcher, registry })
    expect(r.kind).toBe('loaded')
    expect(registry.size).toBe(1)
  })

  it('reports not_found when source missing from fetcher', async () => {
    const r = await loadPlugin('npm:missing', undefined, {
      fetcher: new InMemoryManifestFetcher(),
      registry: new PluginRegistry(),
    })
    expect(r.kind).toBe('failed')
    if (r.kind === 'failed') expect(r.code).toBe('plugin.not_found')
  })

  it('reports integrity_mismatch when expected differs', async () => {
    const fetcher = new InMemoryManifestFetcher()
    const manifest = baseManifest()
    fetcher.register(manifest.source, manifest, 'sha512:' + '0'.repeat(128))
    const r = await loadPlugin(manifest.source, 'sha512:' + '9'.repeat(128), {
      fetcher,
      registry: new PluginRegistry(),
    })
    expect(r.kind).toBe('failed')
    if (r.kind === 'failed') expect(r.code).toBe('plugin.integrity_mismatch')
  })

  it('rejects unsigned plugin when requireSignedPlugins=true', async () => {
    const fetcher = new InMemoryManifestFetcher()
    const manifest = baseManifest()
    fetcher.register(manifest.source, manifest, 'sha512:' + '0'.repeat(128))
    const r = await loadPlugin(manifest.source, undefined, {
      fetcher,
      registry: new PluginRegistry(),
      requireSignedPlugins: true,
    })
    expect(r.kind).toBe('failed')
    if (r.kind === 'failed') expect(r.code).toBe('plugin.signature_required')
  })

  it('verifies signature via injected verifier', async () => {
    const fetcher = new InMemoryManifestFetcher()
    const manifest = baseManifest({
      signature: { algorithm: 'ed25519', publicKey: 'A'.repeat(64), signature: 'B'.repeat(64) },
    })
    fetcher.register(manifest.source, manifest, 'sha512:' + '0'.repeat(128))
    const r = await loadPlugin(manifest.source, undefined, {
      fetcher,
      registry: new PluginRegistry(),
      verifySignature: () => false,
    })
    expect(r.kind).toBe('failed')
    if (r.kind === 'failed') expect(r.code).toBe('plugin.signature_invalid')
  })

  it('rejects api-incompatible plugin', async () => {
    const fetcher = new InMemoryManifestFetcher()
    const manifest = baseManifest({ enginesOs: '^2.0.0' })
    fetcher.register(manifest.source, manifest, 'sha512:' + '0'.repeat(128))
    const r = await loadPlugin(manifest.source, undefined, {
      fetcher,
      registry: new PluginRegistry(),
      hostExtensionApi: '1.0',
    })
    expect(r.kind).toBe('failed')
    if (r.kind === 'failed') expect(r.code).toBe('plugin.api_incompatible')
  })

  it('rejects when required permission denied by policy', async () => {
    const fetcher = new InMemoryManifestFetcher()
    const manifest = baseManifest({
      permissions: [
        {
          resource: 'net:fetch:evil.com',
          actions: ['invoke'],
          reason: 'attack',
          required: true,
        },
      ],
    })
    fetcher.register(manifest.source, manifest, 'sha512:' + '0'.repeat(128))
    const r = await loadPlugin(manifest.source, undefined, {
      fetcher,
      registry: new PluginRegistry(),
      policy: { denyPrefixes: ['net:fetch:evil.com'] },
    })
    expect(r.kind).toBe('failed')
    if (r.kind === 'failed') expect(r.code).toBe('plugin.required_permission_denied')
  })

  it('proceeds when only optional permission denied', async () => {
    const fetcher = new InMemoryManifestFetcher()
    const manifest = baseManifest({
      permissions: [
        {
          resource: 'net:fetch:nice.com',
          actions: ['invoke'],
          reason: 'fetch',
          required: false,
        },
      ],
    })
    fetcher.register(manifest.source, manifest, 'sha512:' + '0'.repeat(128))
    const r = await loadPlugin(manifest.source, undefined, {
      fetcher,
      registry: new PluginRegistry(),
      policy: { denyPrefixes: ['net:fetch:nice.com'] },
    })
    expect(r.kind).toBe('loaded')
  })

  it('reports registry conflict when slot held by another plugin', async () => {
    const fetcher = new InMemoryManifestFetcher()
    const manifest = baseManifest()
    fetcher.register(manifest.source, manifest, 'sha512:' + '0'.repeat(128))
    const registry = new PluginRegistry()
    registry.register({
      point: 'tool',
      id: 'web-search',
      pluginId: 'evil-plugin',
      version: '0.0.1',
    })
    const r = await loadPlugin(manifest.source, undefined, { fetcher, registry })
    expect(r.kind).toBe('failed')
    if (r.kind === 'failed') expect(r.code).toBe('plugin.registry_conflict')
  })
})

describe('filterDangerousPermissions', () => {
  it('flags vault: + net:fetch:any', () => {
    const dangerous = filterDangerousPermissions([
      { resource: 'vault:k', actions: ['read'], reason: 'r', required: true },
      { resource: 'tool:safe', actions: ['invoke'], reason: 'r', required: true },
      { resource: 'net:fetch:any', actions: ['invoke'], reason: 'r', required: true },
      { resource: 'net:fetch:api.openai.com', actions: ['invoke'], reason: 'r', required: true },
    ] as never)
    expect(dangerous).toHaveLength(2)
  })
})
